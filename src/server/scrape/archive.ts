// The Internet Archive's copy of a link, for the ones the live web no longer
// serves: a 2014 article whose site has since folded, been bought and
// redirected to a new front page, or put a bot wall in front of its own
// back catalogue. Keyless, so it works when the Anthropic key does not.
//
// Only a fallback. fetchSourceText is still the first read - a page that
// answers now answers with the article as it stands, while a capture is the
// article as it was on one day.

import { htmlToText, htmlTitle, looksBlocked, MAX_SOURCE_CHARS, type SourceText } from './sourceText';

const CDX = 'http://web.archive.org/cdx/search/cdx';
const FETCH_TIMEOUT_MS = 45000;
// A CDX lookup routinely takes half a minute, so this is deliberately
// generous; the recovery script waits between links as well.
const CDX_TIMEOUT_MS = 90000;
// A capture shorter than this is the site's chrome, not the piece.
const MIN_CAPTURE_CHARS = 500;
// Enough captures to step past the junk ones without walking a decade of a
// busy URL's history.
const MAX_CAPTURES = 6;
// A busy answer clears on its own; these waits double from the first.
const RETRY_WAIT_MS = 20000;
const MAX_RETRIES = 3;
// Not answers: archive.org is busy, timed out behind its gateway, or is
// asking the caller to slow down.
const BUSY = new Set([429, 502, 503, 504]);

export type Capture = { timestamp: string; url: string };

// `id_` asks for the bytes as they were archived, without the toolbar and
// rewriting scripts the Wayback player injects - which otherwise land in the
// text as "__wm.init" and the banner's own markup.
const playbackUrl = (timestamp: string, url: string) => `http://web.archive.org/web/${timestamp}id_/${url}`;

// Wayback stamps a capture YYYYMMDDhhmmss in UTC.
function captureTime(timestamp: string): number {
  const [, y, m, d] = timestamp.match(/^(\d{4})(\d{2})(\d{2})/) ?? [];
  return y ? Date.UTC(Number(y), Number(m) - 1, Number(d)) : 0;
}

// The captures of one URL, status 200 only, one per distinct body (`collapse`
// drops the runs where a page was archived unchanged), nearest `near` first.
export async function captures(url: string, near?: Date): Promise<Capture[]> {
  const query = new URLSearchParams({
    url,
    output: 'json',
    fl: 'timestamp,original',
    filter: 'statuscode:200',
    collapse: 'digest',
    limit: '40',
  });
  // archive.org answers 503 when it is busy, 504 when its own backend timed
  // out, 429 when it is being asked too quickly. Every one of them means "not
  // now" rather than "no copy", so they are waited out rather than reported -
  // a caller that took one for an answer would conclude the link is dead.
  let res: Response | undefined;
  for (let attempt = 0, wait = RETRY_WAIT_MS; ; attempt++, wait *= 2) {
    res = await fetch(`${CDX}?${query}`, { signal: AbortSignal.timeout(CDX_TIMEOUT_MS) });
    if (!BUSY.has(res.status)) break;
    if (attempt >= MAX_RETRIES) throw new Error(`archive.org answered ${res.status} for ${url} after ${attempt + 1} tries`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  if (!res.ok) throw new Error(`archive.org answered ${res.status} for ${url}`);
  const body = (await res.text()).trim();
  if (!body) return [];
  // The first row is the header when `fl` is given.
  const rows = JSON.parse(body) as string[][];
  const found = rows.slice(1).map(([timestamp, original]) => ({ timestamp, url: original }));
  if (!near) return found.reverse().slice(0, MAX_CAPTURES);
  // A capture taken near the pin's own date is the article as the pin cited
  // it; a recent one of a dead URL is often the buyer's front page.
  const want = near.getTime();
  return [...found].sort((a, b) => Math.abs(captureTime(a.timestamp) - want) - Math.abs(captureTime(b.timestamp) - want)).slice(0, MAX_CAPTURES);
}

// The archived text of a link, or undefined when the archive has no usable
// capture of it. Walks the captures in order and keeps the first that reads
// like the article: a capture can itself be a bot wall, a soft 404, or the
// front page the URL had already started redirecting to.
export async function fetchArchivedText(url: string, near?: Date): Promise<(SourceText & { capture: Capture }) | undefined> {
  const found = await captures(url, near);
  for (const capture of found) {
    let html: string;
    try {
      const res = await fetch(playbackUrl(capture.timestamp, capture.url), {
        headers: { accept: 'text/html,application/xhtml+xml' },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      if (!/html|text\/plain/i.test(res.headers.get('content-type') || '')) continue;
      html = await res.text();
    } catch {
      continue; // A capture that will not load is no reason to give up on the rest.
    }
    const text = htmlToText(html).trim().slice(0, MAX_SOURCE_CHARS);
    if (text.length < MIN_CAPTURE_CHARS || looksBlocked(text)) continue;
    return { title: htmlTitle(html)?.slice(0, 1024), text, capture };
  }
  return undefined;
}
