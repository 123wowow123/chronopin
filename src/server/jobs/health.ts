// Whether a pin's media and links still work: a picture whose host now 404s,
// a YouTube video taken down or made private, a post deleted from X, a source
// page gone. The daily jobs' check_pin_health tool (./tools.ts); fixing what
// it finds is the model's part (docs/okf/scraping/daily-jobs.md#pin-health).
//
// A 403 or 429 is reported as "blocked", not "broken": plenty of sites refuse
// a server's fetch but serve a reader's browser, and replacing a working
// picture on that evidence would be worse than leaving it.

import getVideoId from 'get-video-id';
import { mediumID } from '@/lib/appConfig';
import * as db from '../db';

const TIMEOUT_MS = 15000;
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const WIKIMEDIA_UA = 'ChronoPin/1.0 (https://chronopin.com; tech@chronopin.com) link check';

export type LinkState = 'ok' | 'broken' | 'blocked' | 'unreachable';
export type HealthProblem = { what: 'picture' | 'video' | 'post' | 'source' | 'reference'; mediumId?: number; url: string; state: Exclude<LinkState, 'ok'>; detail: string };
export type PinHealth = { pinId: number; title: string; media: { pictures: number; videos: number; posts: number }; problems: HealthProblem[] };

// The HTTP status as a state. Only a status that says the thing is gone counts
// as broken.
export function stateOf(status: number): LinkState {
  if (status >= 200 && status < 400) return 'ok';
  if (status === 401 || status === 403 || status === 429 || status === 451) return 'blocked';
  if (status === 404 || status === 410) return 'broken';
  return status >= 500 ? 'unreachable' : 'broken';
}

async function probe(url: string, accept = '*/*'): Promise<{ state: LinkState; status: number | null; detail: string }> {
  const headers = { 'User-Agent': /wikimedia\.org\//i.test(url) ? WIKIMEDIA_UA : BROWSER_UA, Accept: accept };
  try {
    // GET rather than HEAD: many hosts answer HEAD with 405 or 403. The body
    // is dropped unread.
    const response = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    void response.body?.cancel();
    const state = stateOf(response.status);
    const type = response.headers.get('content-type') ?? '';
    if (state === 'ok' && accept.startsWith('image/') && type && !/^image\//i.test(type)) {
      // A host that retired the file often redirects to a page instead.
      return { state: 'broken', status: response.status, detail: `answers ${type}, not a picture` };
    }
    return { state, status: response.status, detail: `HTTP ${response.status}` };
  } catch (err) {
    return { state: 'unreachable', status: null, detail: (err as Error).message };
  }
}

// YouTube's oEmbed answers 404 for a removed or private video and 401 for one
// whose owner turned embedding off - either way it no longer plays on a pin.
async function youtubeState(videoId: string) {
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  const result = await probe(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`);
  if (result.status === 401 || result.status === 403) return { state: 'broken' as const, detail: 'embedding is disabled or the video is private' };
  if (result.status === 404) return { state: 'broken' as const, detail: 'the video is gone' };
  return { state: result.state, detail: result.detail };
}

async function postState(url: string) {
  const result = await probe(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
  if (result.status === 404) return { state: 'broken' as const, detail: 'the post is deleted or its account is private' };
  return { state: result.state, detail: result.detail };
}

// Checks one pin: every medium, the source, and (when `references`) each
// reference's page. Links are checked a few at a time.
export async function checkPinHealth(pinId: number, { references = false } = {}): Promise<PinHealth | null> {
  const [pin] = await db.query<{ id: number; title: string; sourceUrl: string | null }>(
    `SELECT "id", "title", "sourceUrl" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin) return null;
  const media = await db.query<{ id: number; type: string; originalUrl: string | null; html: string | null }>(
    `
    SELECT "m"."id", "m"."type", "m"."originalUrl", "m"."html"
    FROM "PinMedium" AS "pm" JOIN "Medium" AS "m" ON "m"."id" = "pm"."mediumId"
    WHERE "pm"."pinId" = $1 AND "pm"."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  const refs = references ? await db.query<{ url: string }>(`SELECT "url" FROM "PinReference" WHERE "pinId" = $1`, [pinId]) : [];

  const checks: (() => Promise<HealthProblem | null>)[] = [];
  const counts = { pictures: 0, videos: 0, posts: 0 };
  for (const m of media) {
    const type = Number(m.type);
    if (type === mediumID.image && m.originalUrl) {
      counts.pictures++;
      checks.push(async () => {
        const r = await probe(m.originalUrl!, 'image/jpeg,image/png,image/gif;q=0.9,*/*;q=0.5');
        return r.state === 'ok' ? null : { what: 'picture', mediumId: m.id, url: m.originalUrl!, state: r.state, detail: r.detail };
      });
    } else if (type === mediumID.youtube) {
      counts.videos++;
      const id = getVideoId(m.originalUrl ?? '').id ?? getVideoId(m.html ?? '').id;
      if (id) {
        checks.push(async () => {
          const r = await youtubeState(id);
          return r.state === 'ok' ? null : { what: 'video', mediumId: m.id, url: `https://www.youtube.com/watch?v=${id}`, state: r.state, detail: r.detail };
        });
      }
    } else if (type === mediumID.twitter && m.originalUrl) {
      counts.posts++;
      checks.push(async () => {
        const r = await postState(m.originalUrl!);
        return r.state === 'ok' ? null : { what: 'post', mediumId: m.id, url: m.originalUrl!, state: r.state, detail: r.detail };
      });
    }
  }
  const page = (what: 'source' | 'reference', url: string) => async (): Promise<HealthProblem | null> => {
    const r = await probe(url, 'text/html,application/xhtml+xml,*/*;q=0.8');
    return r.state === 'ok' ? null : { what, url, state: r.state, detail: r.detail };
  };
  if (pin.sourceUrl) checks.push(page('source', pin.sourceUrl));
  for (const ref of refs) checks.push(page('reference', ref.url));

  const problems: HealthProblem[] = [];
  for (let i = 0; i < checks.length; i += 4) {
    for (const found of await Promise.all(checks.slice(i, i + 4).map((check) => check()))) {
      if (found) problems.push(found);
    }
  }
  return { pinId: pin.id, title: pin.title, media: counts, problems };
}

// The pins most worth checking: this week's and the next month's, and the
// most opened of the last week, least recently changed first.
export function pinsToCheck(limit: number) {
  return db.query<{ id: number }>(
    `
    SELECT "p"."id" FROM "Pin" AS "p"
    WHERE "p"."utcDeletedDateTime" IS NULL AND (
      "p"."utcStartDateTime" BETWEEN now() - interval '1 day' AND now() + interval '30 days'
      OR "p"."id" IN (SELECT "pinId" FROM "PinView" WHERE "day" > current_date - 7)
    )
    ORDER BY COALESCE("p"."utcUpdatedDateTime", "p"."utcCreatedDateTime"), "p"."id"
    LIMIT $1`,
    [limit],
  );
}
