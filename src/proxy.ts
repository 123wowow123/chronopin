import { NextResponse, type NextRequest } from 'next/server';
import { identifyBot } from '@/lib/bots';
import { isOffered } from '@/lib/multilingual';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localizePath, negotiateLocale, splitLocale, type Locale } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';
import { topicSlug } from '@/lib/topics';
import * as db from '@/server/db';
import { botRetryAfter } from '@/server/botLimit';
import BotVisit from '@/server/model/botVisit';
import Topics from '@/server/model/topics';
import { timelineMinConfidence } from '@/server/services/timeline';
import { offeredLocales, pinPathCache } from '@/server/services/cache';
import { restaurantPreviewPin } from '@/server/services/restaurantPreview';

// Pin URLs are settled here, before rendering starts. Pages stream their
// shell as soon as a request arrives, after which neither a redirect nor a
// 404 can change the HTTP status any more - and crawlers need both: a 308
// from /pin/123 (or a stale slug) to /pin/123/current-title, and a real 404
// for a pin that does not exist.

// Pin edits clear their entry (invalidatePin), so a renamed pin redirects to
// its new slug at once; the TTL only bounds how long anything else lingers.
const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;

async function canonicalPath(id: number): Promise<string | null> {
  const cache = pinPathCache();
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) {
    // A cached local 404 can predate the preview snapshot being added.
    const preview = hit.path === null ? await restaurantPreviewPin(id) : null;
    return preview ? pinPath(preview) : hit.path;
  }
  const rows = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [id],
  );
  const preview = rows.length ? null : await restaurantPreviewPin(id);
  const path = rows.length ? pinPath(rows[0]) : preview ? pinPath(preview) : null;
  cache.delete(id);
  cache.set(id, { path, expires: Date.now() + TTL_MS });
  if (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value!);
  }
  return path;
}

// Every page is routed under its language (src/app/[lang]). English keeps the
// plain paths: they are rewritten to /en here, and /en/... redirects back to
// them, so each page has one English URL. A visitor who picked another
// language (the locale cookie), or whose browser asks for one on a first
// visit, is sent from a plain path to that language's.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Crawlers are counted here, on the page request itself: they rarely run
  // the script that counts a view. Browsers pass straight through it.
  const userAgent = request.headers.get('user-agent');
  const bot = identifyBot(userAgent);
  BotVisit.record(bot, userAgent, pathname);
  // AI crawlers, scrapers and Applebot have per-bot and shared rate limits
  // (src/server/botLimit.ts). Other search engines pass through. robots.txt stays open to
  // them - it is where they read the Crawl-delay - and so does llms.txt, the
  // one page written for them.
  const retryAfter = pathname === '/robots.txt' || pathname === '/llms.txt' ? null : botRetryAfter(bot);
  if (retryAfter != null) {
    return new NextResponse('Too many requests - please crawl more slowly.', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter), 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  // robots.txt, the sitemap and llms.txt are what a crawler reads first; they
  // come through only to be counted.
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/llms.txt') {
    return NextResponse.next();
  }
  const { locale: prefix, path } = splitLocale(pathname);

  if (prefix === DEFAULT_LOCALE) {
    return redirectTo(request, path + search, 308);
  }
  // A language that is not offered (src/lib/multilingual.ts) is the English
  // page. Not permanent: the admin can offer it again.
  const offered = await offeredLocales();
  if (prefix && !isOffered(offered, prefix)) {
    return redirectTo(request, path + search, 307);
  }
  if (!prefix && offered.length) {
    const preferred = preferredLocale(request, offered);
    if (preferred !== DEFAULT_LOCALE && isOffered(offered, preferred)) {
      // Not permanent: it depends on the visitor.
      return redirectTo(request, localizePath(path, preferred) + search, 307);
    }
  }
  const locale = prefix ?? DEFAULT_LOCALE;

  const pin = await checkPinPath(request, path, locale);
  if (pin) return pin;
  const topic = await checkTopicPath(request, path, locale);
  if (topic) return topic;

  if (!prefix) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${path === '/' ? '' : path}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

// The language picker's choice, else (with none made) the browser's
// Accept-Language among the languages offered. Crawlers send neither and get
// English.
function preferredLocale(request: NextRequest, offered: readonly Locale[]): Locale {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return negotiateLocale(request.headers.get('accept-language'), [DEFAULT_LOCALE, ...offered]) ?? DEFAULT_LOCALE;
}

function redirectTo(request: NextRequest, href: string, status: 307 | 308) {
  return NextResponse.redirect(new URL(href, request.url), status);
}

// Pin URLs: a 308 to the current slug (in the same language), or a real 404.
async function checkPinPath(request: NextRequest, path: string, locale: Locale): Promise<NextResponse | null> {
  const match = /^\/(?:map\/)?pin\/([^/]+)(?:\/([^/]*))?\/?$/.exec(path);
  if (!match) {
    return null;
  }
  const id = Number(match[1]);
  const canonical = Number.isInteger(id) && id > 0 ? await canonicalPath(id).catch(() => undefined) : null;

  if (canonical === undefined) {
    // The database is unreachable; let the page handle it.
    return null;
  }
  if (canonical === null) {
    return NextResponse.rewrite(new URL(`/pin-not-found?lang=${locale}`, request.url), { status: 404 });
  }
  if (canonical !== path) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(canonical, locale);
    return NextResponse.redirect(url, 308);
  }
  return null;
}

export const config = {
  // Everything but route handlers, build assets and the files in public/.
  // robots.txt and sitemap.xml are let in for the bot count and nothing else.
  matcher: [
    '/((?!api/|_next/|auth/|logout|og/|upload/|pin-not-found|sw\\.js|favicon\\.ico|apple-touch-icon\\.png|ads\\.txt|ads/|platforms/|restaurant-images/|privacy\\.html|termsofservice\\.html).*)',
  ],
};

// The slugs that have a /tag or /company page, kept a minute on
// globalThis like the pin paths: a new tag's page can wait that long, and
// one that lost its last pin renders its own not-found meanwhile.
type TopicSlugs = { tag: Set<string>; company: Set<string> };

// The promise is kept, so requests arriving while it loads share one query
// (the tag list reads PinTagView, about 100ms); a failed load is not kept.
function topicSlugs(): Promise<TopicSlugs> {
  const g = globalThis as unknown as { __chronopinTopicSlugs?: { slugs: Promise<TopicSlugs>; expires: number } };
  if (g.__chronopinTopicSlugs && g.__chronopinTopicSlugs.expires > Date.now()) return g.__chronopinTopicSlugs.slugs;
  const slugs = (async () => {
    const minConfidence = await timelineMinConfidence();
    const [tags, companies] = await Promise.all([Topics.tags(minConfidence), Topics.companies(minConfidence)]);
    return { tag: new Set(tags.map((t) => topicSlug(t.name))), company: new Set(companies.map((c) => topicSlug(c.name))) };
  })();
  const entry = { slugs, expires: Date.now() + TTL_MS };
  g.__chronopinTopicSlugs = entry;
  slugs.catch(() => {
    if (g.__chronopinTopicSlugs === entry) delete g.__chronopinTopicSlugs;
  });
  return slugs;
}

// Tag and company URLs, the way pin URLs are checked above: a 308 to the
// slug's one spelling (/tag/Anime -> /tag/anime), or a real 404.
async function checkTopicPath(request: NextRequest, path: string, locale: Locale): Promise<NextResponse | null> {
  const match = /^\/(tag|company)\/([^/]+)\/?$/.exec(path);
  if (!match) {
    return null;
  }
  const kind = match[1] as 'tag' | 'company';
  let raw = match[2];
  try {
    raw = decodeURIComponent(raw);
  } catch {}
  const slug = topicSlug(raw);
  const known = await topicSlugs().then((slugs) => slugs[kind].has(slug), () => undefined);
  if (known === undefined) {
    // The database is unreachable; let the page handle it.
    return null;
  }
  if (!known) {
    return NextResponse.rewrite(new URL(`/pin-not-found?lang=${locale}&page`, request.url), { status: 404 });
  }
  const canonical = `/${kind}/${encodeURIComponent(slug)}`;
  if (canonical !== path) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(canonical, locale);
    return NextResponse.redirect(url, 308);
  }
  return null;
}
