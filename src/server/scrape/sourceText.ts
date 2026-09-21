import _ from 'lodash';
import { tweetText, twitterMedium, youtubeMedium, launchBrowser } from '.';
import { AUDIO_PATH, sourceKind, type SourceKind } from '@/lib/sourceKind';
import { fetchPdfText, looksLikePdf } from './pdfText';
import { fetchPodcastTranscript } from './podcast';
import { fetchTranscript } from './transcript';

export type { SourceKind };

// The text a link's wiki is written from, fetched fresh: a web page's body
// text, a YouTube video's details and transcript, a tweet, or a podcast
// episode's page (its show notes, plus a transcript when one can be found -
// audio itself is not transcribed).

export type SourceText = { title?: string; text: string };

const FETCH_TIMEOUT_MS = 15000;
const NAVIGATION_WAIT_MS = 8000;
// Below this, a fetched page is a script shell; load it in the browser instead.
const MIN_STATIC_CHARS = 500;
// A two-hour transcript runs to about 120k characters.
export const MAX_SOURCE_CHARS = 240000;

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export async function fetchSourceText(url: string, kind: SourceKind = sourceKind(url)): Promise<SourceText> {
  const found =
    kind === 'youtube'
      ? await youtubeText(url)
      : kind === 'tweet'
        ? await tweetSourceText(url)
        : kind === 'podcast'
          ? await podcastText(url)
          : kind === 'pdf'
            ? await fetchPdfText(url)
            : await pageText(url);
  const text = found.text.trim().slice(0, MAX_SOURCE_CHARS);
  if (!text) {
    throw new Error(`No text found at ${url}`);
  }
  return { title: found.title?.trim().slice(0, 1024) || undefined, text };
}

async function youtubeText(url: string): Promise<SourceText> {
  const { res } = await youtubeMedium(url);
  const snippet = _.get(res, 'items[0].snippet', {}) as { title?: string; channelTitle?: string; publishedAt?: string; description?: string };
  // Captions are a bonus: plenty of videos have none.
  const transcript = await fetchTranscript(url).catch(() => undefined);
  const text = [
    `Title: ${snippet.title || ''}`,
    `Channel: ${snippet.channelTitle || ''}`,
    `Published: ${snippet.publishedAt || ''}`,
    '',
    `Description:\n${snippet.description || ''}`,
    ...(transcript ? ['', `Transcript:\n${transcript.text}`] : []),
  ].join('\n');
  return { title: snippet.title, text };
}

// The episode page's show notes, and what was said when a transcript can be
// found (scrape/podcast.ts): the publisher's own, or the show's YouTube upload.
async function podcastText(url: string): Promise<SourceText> {
  const [page, transcript] = await Promise.all([pageText(url), fetchPodcastTranscript(url).catch(() => undefined)]);
  return transcript ? { title: page.title, text: `${page.text}\n\nTranscript:\n${transcript.text}` } : page;
}

async function tweetSourceText(url: string): Promise<SourceText> {
  const { res } = await twitterMedium(url);
  return { title: res.author_name ? `Post by ${res.author_name}` : undefined, text: tweetText(res.html) };
}

// A plain fetch first, which serves most articles; the browser only for pages
// that build themselves with script.
async function pageText(url: string): Promise<SourceText> {
  if (AUDIO_PATH.test(new URL(url).pathname)) {
    throw new Error('Audio files are not transcribed; link the episode page instead');
  }
  let fetched: SourceText | undefined;
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const type = res.headers.get('content-type') || '';
      // Plenty of filings are served from a URL with no .pdf on it, so the
      // body is the other half of the test - and it is the more reliable half,
      // because a server that serves a PDF as application/octet-stream is
      // common. Anything that is not a web page gets its bytes read once and
      // handed over if they begin %PDF.
      if (!/html|text\/plain/i.test(type)) {
        const body = Buffer.from(await res.arrayBuffer());
        if (looksLikePdf(body)) return fetchPdfText(url, body);
        throw new Error(`Unsupported content type ${type || 'unknown'} at ${url}`);
      }
      const body = await res.text();
      if (/html/i.test(type)) {
        const text = htmlToText(body);
        // Only when the rendered markup gave almost nothing: on a normal page
        // the island repeats the article and would double it.
        const island = text.length < MIN_STATIC_CHARS ? jsonIslandText(body) : '';
        fetched = { title: htmlTitle(body), text: island.length > text.length ? island : text };
      } else {
        fetched = { text: body };
      }
    }
  } catch (err) {
    if ((err as Error).message.startsWith('Unsupported content type')) throw err;
    // A timeout or refused fetch may still load in the browser.
  }
  if (fetched && fetched.text.length >= MIN_STATIC_CHARS && !looksBlocked(fetched.text)) {
    return fetched;
  }
  const rendered = await renderedText(url);
  // The browser can hand back the same shell when a site renders its article
  // from a JSON island client-side but paints only the heading.
  if (fetched && rendered.text.length < MIN_STATIC_CHARS && fetched.text.length > rendered.text.length) {
    rendered.text = fetched.text;
  }
  const best = fetched && !looksBlocked(fetched.text) && fetched.text.length > rendered.text.length ? fetched : rendered;
  if (looksBlocked(best.text)) {
    throw new Error(`Blocked: the page is a bot check or error page, not the article (${best.text.replace(/\s+/g, ' ').slice(0, 80)})`);
  }
  return best;
}

// Text a bot check, block or error page serves instead of the article: a
// Cloudflare or Akamai challenge, an access-denied or 403/404 page. A page this
// short that says so is not the article, so it is read again in the browser,
// and failed if it still is (a wiki written from it would be worthless).
// The wall wording moves with the vendor: Cloudflare's own page said "just a
// moment" for years and now says "performing security verification", and a
// wall that goes unrecognised is stored as though it were the article, so its
// wiki is written from the wall. Each pattern below was read off a link that
// had been kept that way (scripts/wiki/recoverDead.ts is the clean-up).
const BLOCKED_TEXT =
  /just a moment|attention required|checking your browser|verify(ing)? (that )?you are (a )?human|are you a robot|access denied|you have been blocked|sorry, you have been blocked|request blocked|enable javascript and cookies|security check|403 forbidden|401 unauthorized|too many requests|error 1015|page not found|404 not found|page can.?t be found|no article with this exact name|performing security verification|security service to protect against malicious bots|detected unusual activity from your computer network|automated bot check in progress|blocked by our server.?s security policies|no articles found|site not found|requested url was not found|permanently removed|not available on our website|just a quick check|checking your connection|prevent automated abuse/i;

export function looksBlocked(text: string): boolean {
  const body = text.trim();
  return body.length < 1500 && BLOCKED_TEXT.test(body);
}

// The browser's own text, once a JavaScript challenge has had time to clear.
const CHALLENGE_WAIT_MS = 12000;

async function renderedText(url: string): Promise<SourceText> {
  const browser = await launchBrowser();
  try {
    const [page] = await browser.pages();
    page.setDefaultNavigationTimeout(NAVIGATION_WAIT_MS);
    // Cloudflare holds "HeadlessChrome"; the same browser named plainly is let through.
    await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));
    try {
      await page.goto(url);
    } catch (err) {
      // A slow page is still worth reading for what did load.
      if ((err as Error).name !== 'TimeoutError') throw err;
    }
    const read = async () => ((await page.evaluate('document.body ? document.body.innerText : ""').catch(() => '')) as string) || '';
    let text = await read();
    // A JavaScript challenge resolves by itself after a few seconds.
    for (const started = Date.now(); looksBlocked(text) && Date.now() - started < CHALLENGE_WAIT_MS; ) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      text = await read();
    }
    return { title: await page.title().catch(() => undefined), text };
  } finally {
    await browser.close();
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

export function htmlTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1];
  const title = og || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeEntities(title).replace(/\s+/g, ' ').trim() || undefined : undefined;
}

// Readable text from an HTML page: scripts, styles and page chrome out, block
// elements as line breaks.
// A page whose body never reaches the DOM as text: Next.js and its imitators
// ship the article inside a JSON island and render it from there, so both the
// plain fetch and the browser can come back with the headline and nothing else
// (cosm.com returned 92 characters either way). Rather than give up on those,
// the island is parsed and every string in it long enough to be prose is kept,
// in document order, deduplicated. It is a fallback, not a parser: the shape of
// the JSON differs per site, so this looks for text rather than for fields.
const JSON_ISLAND = /<script[^>]+(?:id="__NEXT_DATA__"|type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/gi;
// Short strings in these islands are keys, slugs, class names and ids; prose is
// longer. 60 characters keeps a one-line summary and drops "hero-image-wide".
const MIN_ISLAND_STRING = 60;
// Islands also carry the page's own code - cosm.com ships its article as
// compiled MDX, so the longest strings in it are JavaScript. Taking those would
// be worse than taking nothing, because a wiki written from them looks full.
const LOOKS_LIKE_CODE =
  /\b(function|return|const|let|var|import|export|typeof|undefined|null)\b|=>|_jsx|\$\{|<\/?[A-Z][A-Za-z]*\s*\/?>|[{};]\s*$/;

// Prose has words and sentence punctuation; a config blob has braces, colons
// and paths. Requiring a few plain words keeps the test cheap and stable.
function looksLikeProse(text: string): boolean {
  if (LOOKS_LIKE_CODE.test(text)) return false;
  const words = text.match(/\b[A-Za-z][A-Za-z'’-]{2,}\b/g) ?? [];
  if (words.length < 8) return false;
  const punctuation = (text.match(/[{}[\]<>|\\/=_]/g) ?? []).length;
  return punctuation / text.length < 0.04;
}

export function jsonIslandText(html: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const take = (value: unknown) => {
    if (typeof value === 'string') {
      // A string that is one long URL, or markup with no words between tags,
      // is not prose however long it runs.
      const text = /<[a-z][^>]*>/i.test(value) ? htmlToText(value) : value.trim();
      if (text.length >= MIN_ISLAND_STRING && looksLikeProse(text) && !seen.has(text)) {
        seen.add(text);
        out.push(text);
      }
      return;
    }
    if (Array.isArray(value)) return value.forEach(take);
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).forEach(take);
  };
  for (const match of html.matchAll(JSON_ISLAND)) {
    try {
      take(JSON.parse(match[1]));
    } catch {
      // A malformed or templated island is skipped; the others may still parse.
    }
  }
  return out.join('\n\n');
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template|iframe|nav|footer|form)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(br|hr)\b[^>]*>/gi, '\n')
      .replace(/<\/?(p|div|section|article|header|main|aside|h[1-6]|li|ul|ol|tr|table|blockquote|pre|figure|figcaption)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
