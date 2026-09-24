import { NextResponse, type NextRequest } from 'next/server';
import { identifyBot } from '@/lib/bots';
import { isOffered } from '@/lib/multilingual';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localizePath, negotiateLocale, splitLocale, type Locale } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';
import * as db from '@/server/db';
import { botRetryAfter } from '@/server/botLimit';
import BotVisit from '@/server/model/botVisit';
import { offeredLocales, pinPathCache } from '@/server/services/cache';

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
    return hit.path;
  }
  const rows = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [id],
  );
  const path = rows.length ? pinPath(rows[0]) : null;
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
  // AI crawlers are slowed to a steady pace (src/server/botLimit.ts); search
  // engines are not, so indexing is never held back. robots.txt stays open to
  // them - it is where they read the Crawl-delay.
  const retryAfter = pathname === '/robots.txt' ? null : botRetryAfter(bot);
  if (retryAfter != null) {
    return new NextResponse('Too many requests - please crawl more slowly.', {
      status: 429,
      headers: { 'Retry-After': String(retryAfter), 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  // robots.txt and the sitemap are what a crawler reads first; they come
  // through only to be counted.
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
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
    '/((?!api/|_next/|auth/|logout|og/|upload/|pin-not-found|favicon\\.ico|ads\\.txt|privacy\\.html|termsofservice\\.html).*)',
  ],
};
