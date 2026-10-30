import { NextResponse, type NextRequest } from 'next/server';
import { identifyBot } from '@/lib/bots';
import { isLandingPath, isReload, landingReferrerPath, pinIdOfPath, referrerSource } from '@/lib/landing';
import { isOffered } from '@/lib/multilingual';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localizePath, negotiateLocale, splitLocale, type Locale } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';
import { topicSlug } from '@/lib/topics';
import * as db from '@/server/db';
import { sessionOf, TOKEN_COOKIE } from '@/server/auth';
import { homeCacheKey, homeCopy, validTimeZone, type HomeCopy } from '@/server/homeCache';
import serverConfig from '@/server/config';
import { cookieGate, gateId, gateIdOf, GATE_COOKIE, GATE_MAX_AGE, GATE_PARAM } from '@/server/cookieGate';
import { bareSearchRetryAfter, botRetryAfter, chinaRetryAfter, isChineseAddress, ipRetryAfter, localeMismatch, mismatchRetryAfter, pinRetryAfter, searchRetryAfter, PREFETCH_COST, SHED_RETRY_AFTER } from '@/server/botLimit';
import AdFreeSubscription from '@/server/model/adFreeSubscription';
import PremiumSubscription from '@/server/model/premiumSubscription';
import HeavyUserPlan from '@/server/model/heavyUserPlan';
import BotVisit from '@/server/model/botVisit';
import LandingVisit from '@/server/model/landingVisit';
import Person from '@/server/model/person';
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

// Pages that stay open to a visitor over the limit: the plan's own page and
// signing in or up to buy it.
function isLimitExempt(pathname: string): boolean {
  return /^\/(?:heavy-use|login|signup)(?:\/|$)/.test(splitLocale(pathname).path);
}

// The signed-out home page is rendered once a minute per language and time
// zone and handed to everyone else (src/server/homeCache.ts). The copy is made
// by asking this same server for the page, with a header only this process
// knows, which skips every check here and goes straight to the page.
const FILL_HEADER = 'x-home-fill';

function fillSecret(): string {
  const g = globalThis as unknown as { __chronopinHomeFill?: string };
  return (g.__chronopinHomeFill ??= crypto.randomUUID());
}

// The routing every page request ends with: English paths are rewritten to /en.
function routed(request: NextRequest): NextResponse {
  const { locale: prefix, path } = splitLocale(request.nextUrl.pathname);
  if (prefix) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${path === '/' ? '' : path}`;
  return NextResponse.rewrite(url);
}

async function renderHome(pathname: string, timeZone: string): Promise<HomeCopy | null> {
  const res = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}${pathname}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(90_000),
    headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (home page copy)', cookie: `tz=${encodeURIComponent(timeZone)}`, [FILL_HEADER]: fillSecret() },
  });
  // Only a plain page is kept: not a redirect or error, and nothing that sets a cookie.
  if (res.status !== 200 || res.headers.has('set-cookie') || !(res.headers.get('content-type') ?? '').includes('text/html')) return null;
  return {
    status: 200,
    headers: [
      ['content-type', res.headers.get('content-type')!],
      ['cache-control', 'private, no-store'],
    ],
    body: new Uint8Array(await res.arrayBuffer()),
    madeAt: Date.now(),
  };
}

// The answer to a pin request the cookie gate stopped (src/server/cookieGate.ts).
// Prefetches and RSC fetches are answered 403 instead of redirected: the client
// then loads the page normally, which is redirected as a first visit.
async function gated(request: NextRequest, action: 'issue' | 'strip' | 'blocked'): Promise<NextResponse> {
  if (action === 'blocked') {
    return new NextResponse('Cookies are required to view this page. Please enable them and reload.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  const client = request.headers.has('next-router-prefetch') || request.headers.has('rsc');
  if (client && action === 'issue') return new NextResponse(null, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  const url = request.nextUrl.clone();
  if (action === 'issue') url.searchParams.set(GATE_PARAM, '1');
  else url.searchParams.delete(GATE_PARAM);
  const response = NextResponse.redirect(url, 307);
  response.headers.set('Cache-Control', 'no-store');
  if (action === 'issue') {
    const secure = (request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')) === 'https';
    response.cookies.set(GATE_COOKIE, await gateId(serverConfig.secrets.session), { path: '/', maxAge: GATE_MAX_AGE, sameSite: 'lax', httpOnly: true, secure });
  }
  return response;
}

// The answer to a visitor over the limit: a page that offers the heavy user
// plan (a rewrite, so the address stays) when a browser asked for a page, else
// plain text. Both are 429 with Retry-After. A heavy user over their light
// limit just waits.
function tooManyRequests(request: NextRequest, wait: number, light: boolean, region = false): NextResponse {
  const headers = { 'Retry-After': String(wait) };
  const wantsPage = request.method === 'GET' && (request.headers.get('accept') ?? '').includes('text/html') && !request.headers.has('rsc');
  if (!wantsPage || light) {
    return new NextResponse('Too many requests - please slow down.', { status: 429, headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  // A Chinese region limit (botLimit.chinaRetryAfter) shows the plans in Chinese
  // to a browser that asks for it, and not the sign-in hint: signing in does
  // not lift it, a paid plan does.
  const chinese = region && /^zh\b/i.test(request.headers.get('accept-language')?.trim() ?? '');
  const locale = cookie && isLocale(cookie) ? cookie : chinese ? 'zh' : DEFAULT_LOCALE;
  const url = new URL(`/${locale}/heavy-use`, request.url);
  url.searchParams.set('limited', '1');
  if (region) url.searchParams.set('region', '1');
  return NextResponse.rewrite(url, { status: 429, headers });
}

// A signed-out client over its pin budget (botLimit.pinRetryAfter) is sent to
// sign in, where the form says signed-in users get higher limits. A browser
// asking for a page gets a 307 to /login that returns to the pin afterwards;
// anything else (fetches, RSC, other methods) gets a plain 429.
function signInForMore(request: NextRequest, wait: number): NextResponse {
  const wantsPage = request.method === 'GET' && (request.headers.get('accept') ?? '').includes('text/html') && !request.headers.has('rsc');
  if (!wantsPage) return tooManyRequests(request, wait, false);
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = cookie && isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const back = new URL(request.url);
  back.searchParams.delete(GATE_PARAM);
  const to = new URL(localizePath('/login', locale), request.url);
  to.searchParams.set('limited', '1');
  to.searchParams.set('redirect', back.pathname + back.search);
  return NextResponse.redirect(to, { status: 307, headers: { 'Retry-After': String(wait) } });
}

// Every page is routed under its language (src/app/[lang]). English keeps the
// plain paths: they are rewritten to /en here, and /en/... redirects back to
// them, so each page has one English URL. A visitor who picked another
// language (the locale cookie), or whose browser asks for one on a first
// visit, is sent from a plain path to that language's.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // The home page copy being made (renderHome): not counted, limited or gated.
  if (request.headers.get(FILL_HEADER) === fillSecret()) return routed(request);

  // Crawlers are counted here, on the page request itself: they rarely run
  // the script that counts a view. Browsers pass straight through it.
  const userAgent = request.headers.get('user-agent');
  const bot = identifyBot(userAgent);
  BotVisit.record(bot, userAgent, pathname);
  // AI crawlers, scrapers and Applebot have per-bot and shared rate limits
  // (src/server/botLimit.ts), and are turned away while the server is
  // struggling; Google's crawlers are held to 10 a minute then. Other search
  // engines pass through. robots.txt stays open to
  // them - it is where they read the Crawl-delay - and so does llms.txt, the
  // one page written for them.
  const retryAfter = pathname === '/robots.txt' || pathname === '/llms.txt' ? null : botRetryAfter(bot);
  // Everyone no bot name explains gets a request budget (ipRetryAfter), which
  // catches scrapers posing as browsers: per signed-in user, else per address
  // (Caddy appends the address it saw, so the last X-Forwarded-For entry is
  // the real one). Admins are exempt, and a heavy user plan swaps the budget
  // for a light one. Whoever runs out is shown the plan's page
  // (src/app/[lang]/heavy-use), which itself and the sign-in pages stay open.
  const session = await sessionOf(request.cookies.get(TOKEN_COOKIE)?.value);
  // Pin pages are not rendered for a client that keeps no cookies (cookieGate).
  const gateClient = await gateIdOf(request.cookies.get(GATE_COOKIE)?.value, serverConfig.secrets.session);
  if (retryAfter == null) {
    const gate = cookieGate({
      path: splitLocale(pathname).path,
      method: request.method,
      bot: !!bot,
      signedIn: !!session,
      hasGateCookie: gateClient != null,
      hasGateParam: request.nextUrl.searchParams.has(GATE_PARAM),
      hasQuery: request.nextUrl.searchParams.has('q'),
    });
    if (gate !== 'pass') return gated(request, gate);
    // Each cookie's own pin budget (botLimit.pinRetryAfter): signed-in users
    // and admins have their own, and named bots theirs.
    if (gateClient && !bot && !session && /^\/pin\/\d+(?:\/|$)/.test(splitLocale(pathname).path)) {
      const prefetching = request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch';
      const wait = pinRetryAfter(gateClient, Date.now(), prefetching ? PREFETCH_COST : 1);
      if (wait != null) return signInForMore(request, wait);
    }
    // Searches with a query have their own budget per cookie.
    if (gateClient && !bot && !session && request.method === 'GET' && splitLocale(pathname).path === '/search' && request.nextUrl.searchParams.has('q')) {
      const prefetching = request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch';
      const wait = searchRetryAfter(gateClient, Date.now(), prefetching ? PREFETCH_COST : 1);
      if (wait != null) return signInForMore(request, wait);
      // No Referer: one shared bucket while the server sheds load.
      if (!request.headers.get('referer')) {
        const bare = bareSearchRetryAfter();
        if (bare != null) return tooManyRequests(request, bare, true);
      }
    }
  }
  if (retryAfter == null && !bot && !session?.admin && !isLimitExempt(pathname)) {
    const address = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? '';
    // Visitors from Chinese address ranges: 80 different addresses a minute
    // between them (botLimit.chinaRetryAfter). Signed-in users with a paid plan
    // (ad-free, heavy-use or Premium) pass.
    if (address && (await isChineseAddress(address))) {
      const paid = session
        ? (await AdFreeSubscription.isActive(session.id).catch(() => false)) || (await PremiumSubscription.status(session.id).then((s) => s.active).catch(() => false))
        : false;
      const china = paid ? null : chinaRetryAfter(address);
      if (china != null) return tooManyRequests(request, china, false, true);
    }
    const key = session ? `u:${session.id}` : `ip:${address}`;
    const light = session ? await HeavyUserPlan.isActive(session.id).catch(() => false) : false;
    const prefetching = request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch';
    const wait = ipRetryAfter(key, light, Date.now(), prefetching ? PREFETCH_COST : 1);
    if (wait != null) return tooManyRequests(request, wait, light);
  }
  // A Chinese-language browser on a page in another language shares one small
  // bucket while the server sheds load (botLimit.mismatchRetryAfter).
  if (retryAfter == null && !bot && !session && request.method === 'GET' && !isLimitExempt(pathname)) {
    if (localeMismatch(request.headers.get('accept-language'), splitLocale(pathname).locale)) {
      const wait = mismatchRetryAfter();
      if (wait != null) return tooManyRequests(request, wait, true);
    }
  }
  if (retryAfter != null) {
    // 503 while the server sheds crawlers to protect itself (botLimit.shedding);
    // 429 when a bot is over its own budget.
    const shed = retryAfter === SHED_RETRY_AFTER;
    return new NextResponse(shed ? 'Temporarily unavailable - please retry later.' : 'Too many requests - please crawl more slowly.', {
      status: shed ? 503 : 429,
      headers: { 'Retry-After': String(retryAfter), 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  // robots.txt, the sitemap and llms.txt are what a crawler reads first; they
  // come through only to be counted.
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/sitemap-restaurants.xml' || pathname === '/llms.txt') {
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

  // Human visits to landing pages, by referrer. Prefetches, reloads and admins'
  // own visits are not counted, and this runs after the redirects, so each visit is
  // counted once.
  const prefetch = request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch';
  const reload = isReload(request.headers.get('cache-control'), request.headers.get('pragma'));
  const counted = !bot && !prefetch && !reload && request.method === 'GET' && !session?.admin;
  // Each viewer counts once a day: by user id, else the visitor cookie (set
  // when they first view a pin), else address and user agent.
  const vid = request.cookies.get('vid')?.value;
  const viewer = session ? `u:${session.id}` : vid ? `v:${vid}` : `ip:${request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? ''}|${userAgent ?? ''}`;
  if (counted && isLandingPath(path) && (await LandingVisit.firstToday(viewer, `page\n${path}`))) {
    LandingVisit.record(path, referrerSource(request.headers.get('referer'), request.nextUrl.host));
  }

  const pin = await checkPinPath(request, path, locale);
  if (pin) return pin;
  // A restaurant opened from a landing page: its pin page, referred by it.
  const pinId = counted ? pinIdOfPath(path) : null;
  if (pinId) {
    const from = landingReferrerPath(request.headers.get('referer'), request.nextUrl.host, (p) => splitLocale(p).path);
    if (from && (await LandingVisit.firstToday(viewer, `pin\n${pinId}`))) LandingVisit.recordClick(from, pinId);
  }
  const topic = await checkTopicPath(request, path, locale);
  if (topic) return topic;

  // Signed-out visitors to the home page get a copy made at most a minute ago.
  const homeKey = homeCacheKey({
    method: request.method,
    path,
    locale,
    search,
    signedIn: !!session,
    clientNavigation: prefetch || request.headers.has('rsc') || request.headers.has('next-url'),
    accept: request.headers.get('accept'),
    timeZone: validTimeZone(request.cookies.get('tz')?.value),
  });
  if (homeKey) {
    const copy = await homeCopy(homeKey, () => renderHome(pathname, homeKey.split('|')[1]));
    if (copy) return new NextResponse(copy.body as BodyInit, { status: copy.status, headers: copy.headers });
  }
  return routed(request);
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
    '/((?!api/|_next/|auth/|logout|og/|embed/|upload/|pin-not-found|sw\\.js|favicon\\.ico|apple-touch-icon\\.png|ads\\.txt|ads/|platforms/|restaurant-images/|privacy\\.html|termsofservice\\.html).*)',
  ],
};

// The slugs that have a /tag, /company or /person page, kept a minute on
// globalThis like the pin paths: a new tag's page can wait that long, and
// one that lost its last pin renders its own not-found meanwhile.
type TopicSlugs = { tag: Set<string>; company: Set<string>; person: Set<string> };

// The promise is kept, so requests arriving while it loads share one query
// (the tag list reads PinTagView, about 100ms); a failed load is not kept.
function topicSlugs(): Promise<TopicSlugs> {
  const g = globalThis as unknown as { __chronopinTopicSlugs?: { slugs: Promise<TopicSlugs>; expires: number } };
  if (g.__chronopinTopicSlugs && g.__chronopinTopicSlugs.expires > Date.now()) return g.__chronopinTopicSlugs.slugs;
  const slugs = (async () => {
    const minConfidence = await timelineMinConfidence();
    const [tags, companies, people] = await Promise.all([Topics.tags(minConfidence), Topics.companies(minConfidence), Person.list()]);
    return {
      tag: new Set(tags.map((t) => topicSlug(t.name))),
      company: new Set(companies.map((c) => topicSlug(c.name))),
      person: new Set(people.map((p) => p.slug)),
    };
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
  const match = /^\/(tag|company|person)\/([^/]+)\/?$/.exec(path);
  if (!match) {
    return null;
  }
  const kind = match[1] as 'tag' | 'company' | 'person';
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
