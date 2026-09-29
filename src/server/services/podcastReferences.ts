import { urlKey } from '@/lib/citations';
import * as db from '../db';
import { JudgeUnavailable, judgeEpisode } from '../extract/podcastReference';
import { MIN_CONFIDENCE } from '../extract/references';
import PinReference from '../model/pinReference';
import { episodeTranscript, type PodcastEpisode, searchEpisodes, wordOverlap, words } from '../scrape/podcast';
import log from '../util/log';
import { invalidatePin } from './cache';

// Cross-checks a new pin against podcast episodes on Apple Podcasts: episodes
// released around the event whose title or show notes name it are read (show
// notes plus transcript, see scrape/podcast.ts), and those that back the event
// up are added as references.
//
// Claude judges each episode when it can be reached. Without it (no key, no
// credit), an episode only counts when one passage names the event and says
// its day, and then only at the minimum confidence a reference is kept at.

// Episodes read per pin; each can cost a feed download and a YouTube search.
const MAX_CANDIDATES = 4;
const MAX_ADDED = 2;
// An episode is looked at if it came out this long before the event starts...
const DAYS_BEFORE = 365;
// ...up to this long after it ends.
const DAYS_AFTER = 60;
// Podcasts barely exist before this.
const EARLIEST = Date.UTC(2005, 0, 1);
// Share of the event's words an episode's title and notes must have to be read,
// and a passage must have to count without Claude.
const LISTING_OVERLAP = 0.6;
const PASSAGE_OVERLAP = 0.8;
const PASSAGE_WORDS = 60; // either side of a match
const MAX_PASSAGES = 3;
// Without Claude, how many words from a date the event's name may be.
const DATE_REACH = 20;
// Apple's search allows about 20 calls a minute.
const SEARCH_GAP_MS = 3500;

// Words in an event title that say what happens rather than to what.
const EVENT_WORDS = new Set([
  'open', 'opens', 'opened', 'opening', 'fully', 'officially', 'launch', 'launches', 'launched', 'release', 'releases', 'released',
  'premiere', 'premieres', 'premiered', 'debut', 'debuts', 'inaugurated', 'inauguration', 'inaugurates', 'begins', 'begin', 'starts',
  'start', 'arrives', 'arrive', 'marks', 'unveils', 'unveiled', 'announced', 'announces', 'completes', 'completed', 'completion',
  'goes', 'live', 'set', 'new', 'first', 'as', 'in', 'on', 'of', 'to', 'at', 'by', 'its', 'the', 'and', 'for', 'with', 'a', 'an',
]);

export type PodcastCheck = {
  episode: PodcastEpisode;
  transcript?: 'feed' | 'youtube';
  judgedBy?: 'claude' | 'keywords';
  confidence?: number;
  reasoning?: string;
  added: boolean;
  note?: string;
};

type PinFacts = {
  title: string;
  description: string | null;
  utcStartDateTime: Date;
  utcEndDateTime: Date | null;
  allDay: boolean;
  sourceUrl: string | null;
};

// One pin at a time across the process, spaced for Apple's rate limit: a
// scrape session can save hundreds of pins in a row.
const g = globalThis as unknown as { __chronopinPodcastQueue?: Promise<unknown> };

export function crossCheckPodcasts(pinId: number, options: { dryRun?: boolean } = {}): Promise<PodcastCheck[]> {
  const run = (g.__chronopinPodcastQueue ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => checkPin(pinId, options))
    .finally(() => new Promise((resolve) => setTimeout(resolve, SEARCH_GAP_MS)));
  g.__chronopinPodcastQueue = run;
  return run.then((checks) => checks);
}

async function checkPin(pinId: number, { dryRun = false }: { dryRun?: boolean }): Promise<PodcastCheck[]> {
  const [pin] = await db.query<PinFacts>(
    `SELECT "title", "description", "utcStartDateTime", "utcEndDateTime", "allDay", "sourceUrl"
     FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin?.title || pin.utcStartDateTime.getTime() < EARLIEST) return [];
  const anchors = eventWords(pin.title);
  if (!anchors.length) return [];

  const start = pin.utcStartDateTime.getTime();
  const end = (pin.utcEndDateTime ?? pin.utcStartDateTime).getTime();
  const known = await knownUrls(pinId, pin.sourceUrl);
  const candidates = (await searchAround(anchors))
    .filter((e) => {
      const released = e.releaseDate ? Date.parse(e.releaseDate) : NaN;
      return e.url && !known.has(urlKey(e.url)!) && released >= start - DAYS_BEFORE * 86400000 && released <= end + DAYS_AFTER * 86400000;
    })
    // One episode can be listed under more than one show id.
    .filter((e, i, all) => all.findIndex((o) => o.title === e.title && o.releaseDate?.slice(0, 10) === e.releaseDate?.slice(0, 10)) === i)
    .map((e) => ({ e, overlap: wordOverlap(anchors.join(' '), `${e.title} ${e.description ?? ''}`) }))
    .filter(({ overlap }) => overlap >= LISTING_OVERLAP)
    .sort((a, b) => b.overlap - a.overlap || Math.abs(Date.parse(a.e.releaseDate!) - start) - Math.abs(Date.parse(b.e.releaseDate!) - start))
    .slice(0, MAX_CANDIDATES)
    .map(({ e }) => e);

  const checks: PodcastCheck[] = [];
  for (const episode of candidates) {
    checks.push(await checkEpisode(pin, anchors, episode));
  }

  const keep = checks
    .filter((c) => (c.confidence ?? 0) >= MIN_CONFIDENCE)
    .sort((a, b) => b.confidence! - a.confidence!)
    .slice(0, MAX_ADDED);
  if (keep.length && !dryRun) {
    // Re-read: the pin may have been edited while the episodes were read.
    const fresh = await knownUrls(pinId, pin.sourceUrl);
    const references = keep
      .filter((c) => !fresh.has(urlKey(c.episode.url!)!))
      .map(
        (c) =>
          new PinReference({
            pinId,
            url: c.episode.url,
            title: `${c.episode.show}: ${c.episode.title}`.slice(0, 1024),
            confidence: c.confidence,
            publishedDate: c.episode.releaseDate?.slice(0, 10),
            reasoning: c.reasoning,
          }),
      );
    const problem = PinReference.problem(references.map((r) => r.toJSON()));
    if (problem) {
      log.warn(`podcast references for pin ${pinId} not saved: ${problem}`);
    } else if (references.length) {
      await PinReference.saveAll(references);
      references.forEach((r) => (checks.find((c) => c.episode.url === r.url)!.added = true));
      await afterAdding(pinId);
    }
  }
  return checks;
}

async function checkEpisode(pin: PinFacts, anchors: string[], episode: PodcastEpisode): Promise<PodcastCheck> {
  const check: PodcastCheck = { episode, added: false };
  let transcript = '';
  try {
    const found = await episodeTranscript(episode);
    transcript = found.text;
    check.transcript = found.source;
  } catch (err) {
    check.note = `no transcript: ${(err as Error).message}`;
  }
  const passages = findPassages(transcript, anchors);
  const notes = episode.description?.slice(0, 3000) ?? '';

  try {
    const verdict = await judgeEpisode({
      pin: {
        title: pin.title,
        description: pin.description,
        start: pin.utcStartDateTime.toISOString(),
        end: pin.utcEndDateTime?.toISOString() ?? null,
      },
      episode: { show: episode.show, title: episode.title, releaseDate: episode.releaseDate, description: notes },
      passages,
    });
    check.judgedBy = 'claude';
    if (verdict?.sameEvent) {
      check.confidence = verdict.confidence;
      check.reasoning = verdict.reasoning;
    }
    return check;
  } catch (err) {
    if (!(err instanceof JudgeUnavailable)) throw err;
  }

  check.judgedBy = 'keywords';
  const said = keywordEvidence(pin, anchors, episode, [notes, ...passages]);
  if (said) {
    check.confidence = MIN_CONFIDENCE;
    check.reasoning = `${episode.show}'s episode "${episode.title}" (${episode.releaseDate?.slice(0, 10)}) says: "${said}"`.slice(0, 2000);
  }
  return check;
}

// The words of an event title that name the thing, not what happens to it.
export function eventWords(title: string): string[] {
  return [...new Set(words(title).filter((w) => !EVENT_WORDS.has(w)))];
}

// Apple's search wants every word. The whole name and its first words (the
// subject, in an event title), merged; failing both, fewer words until
// something turns up.
async function searchAround(anchors: string[]): Promise<PodcastEpisode[]> {
  const queries = [...new Set([anchors.join(' '), anchors.slice(0, 3).join(' ')])];
  for (let n = Math.min(anchors.length, 3) - 1; n >= 2; n--) queries.push(anchors.slice(0, n).join(' '));
  const found = new Map<string, PodcastEpisode>();
  for (const [i, query] of queries.entries()) {
    if (i >= 2 && found.size) break;
    if (i) await new Promise((resolve) => setTimeout(resolve, SEARCH_GAP_MS));
    const episodes = await searchEpisodes(query, { limit: 50 }).catch((err) => {
      log.warn('podcast search failed:', (err as Error).message);
      return undefined;
    });
    if (!episodes) break;
    for (const e of episodes) if (e.url && !found.has(e.url)) found.set(e.url, e);
  }
  return [...found.values()];
}

async function knownUrls(pinId: number, sourceUrl: string | null): Promise<Set<string>> {
  const rows = await db.query<{ url: string }>(`SELECT "url" FROM "PinReference" WHERE "pinId" = $1`, [pinId]);
  return new Set([sourceUrl, ...rows.map((r) => r.url)].flatMap((u) => (u && urlKey(u) ? [urlKey(u)!] : [])));
}

// Stretches of the transcript around the event's words, best first, that hold
// most of them.
export function findPassages(text: string, anchors: string[], minOverlap = LISTING_OVERLAP): string[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const norm = tokens.map((t) => words(t));
  const want = new Set(anchors);
  const scored: { from: number; to: number; score: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!norm[i].some((w) => want.has(w))) continue;
    const from = Math.max(0, i - PASSAGE_WORDS);
    const to = Math.min(tokens.length, i + PASSAGE_WORDS);
    const seen = new Set(norm.slice(from, to).flat().filter((w) => want.has(w)));
    scored.push({ from, to, score: seen.size / want.size });
  }
  const picked: typeof scored = [];
  for (const s of scored.sort((a, b) => b.score - a.score || a.from - b.from)) {
    if (s.score < minOverlap || picked.length >= MAX_PASSAGES) break;
    if (picked.every((p) => s.to <= p.from || s.from >= p.to)) picked.push(s);
  }
  return picked.sort((a, b) => a.from - b.from).map((p) => tokens.slice(p.from, p.to).join(' '));
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// Without Claude: a passage (or the show notes) that has nearly all the
// event's words and says its day, as a date or as "today"/"yesterday" on an
// episode out that day or the next. Resolves to the words around the date.
export function keywordEvidence(pin: Pick<PinFacts, 'utcStartDateTime' | 'allDay'>, anchors: string[], episode: Pick<PodcastEpisode, 'releaseDate'>, texts: string[]): string | undefined {
  const day = pin.utcStartDateTime;
  // A timed pin's UTC day can be a day off the day people said out loud.
  const days = pin.allDay ? [day] : [-1, 0, 1].map((d) => new Date(day.getTime() + d * 86400000));
  const patterns = days.flatMap((d) => {
    const month = MONTHS[d.getUTCMonth()];
    const n = d.getUTCDate();
    const m = `(?:${month}|${month.slice(0, 3)}\\.?${month === 'september' ? '|sept\\.?' : ''})`;
    const dd = `${n}(?:st|nd|rd|th)?`;
    return [new RegExp(`\\b${m}\\s+(?:the\\s+)?${dd}\\b`, 'i'), new RegExp(`\\b${dd}\\s+(?:of\\s+)?${m}\\b`, 'i')];
  });
  const released = episode.releaseDate ? Date.parse(episode.releaseDate.slice(0, 10)) : NaN;
  const daysAfter = Math.round((released - Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())) / 86400000);
  if (daysAfter === 0) patterns.push(/\b(today|tonight|this morning)\b/i);
  if (daysAfter === 1) patterns.push(/\b(yesterday|last night)\b/i);
  // "On Tuesday", "Tuesday the 9th": only from an episode out within the week.
  if (daysAfter >= 0 && daysAfter <= 6) patterns.push(new RegExp(`\\b(?:on|last|this past)\\s+${WEEKDAYS[day.getUTCDay()]}\\b|\\b${WEEKDAYS[day.getUTCDay()]}\\s+the\\s+${day.getUTCDate()}(?:st|nd|rd|th)\\b`, 'i'));
  // "the 9th" alone: the same month, within a few weeks.
  if (daysAfter >= 0 && daysAfter <= 20 && new Date(released).getUTCMonth() === day.getUTCMonth()) {
    patterns.push(new RegExp(`\\bthe\\s+${day.getUTCDate()}(?:st|nd|rd|th)\\b`, 'i'));
  }

  // The date has to be said about the event, so the event's name sits close by.
  const want = new Set(anchors);
  for (const text of texts) {
    for (const passage of findPassages(text, anchors, PASSAGE_OVERLAP)) {
      for (const pattern of patterns) {
        const global = new RegExp(pattern.source, 'gi');
        for (const m of passage.matchAll(global)) {
          const near = around(passage, m.index, m[0].length, DATE_REACH);
          const named = new Set(words(near).filter((w) => want.has(w)));
          if (named.size / want.size >= PASSAGE_OVERLAP) return around(passage, m.index, m[0].length, 25);
        }
      }
    }
  }
  return undefined;
}

// The words either side of a match.
function around(text: string, index: number, length: number, reach: number): string {
  const before = text.slice(0, index).split(/\s+/).slice(-reach).join(' ');
  const after = text.slice(index + length).split(/\s+/).slice(0, reach).join(' ');
  return `${before} ${text.slice(index, index + length)} ${after}`.replace(/\s+/g, ' ').trim();
}

// The pin page lists references and the timeline filters on confidence; the
// wiki takes the episode in as a new link.
async function afterAdding(pinId: number) {
  try {
    invalidatePin(pinId);
  } catch {
    // Outside a Next.js server (a script), there is no page cache to expire.
  }
  const { refreshPin } = await import('./sourceWiki');
  await refreshPin(pinId).catch((err) => log.warn(`wiki refresh failed for pin ${pinId}:`, (err as Error).message));
}
