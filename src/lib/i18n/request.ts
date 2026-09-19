// A route handler's language. Route handlers sit outside the [lang] tree and
// cannot read its root param, so the page sends its language along.

import { isLocale, LOCALE_COOKIE, localeOr, type Locale } from './config';

// A route handler's language: ?lang= when the page sent it, else the
// language picker's cookie, else English.
export function requestLocale(
  request: { nextUrl?: URL; url?: string; cookies: { get(name: string): { value: string } | undefined } },
  { cookie = true }: { cookie?: boolean } = {},
): Locale {
  const url = request.nextUrl ?? (request.url ? new URL(request.url) : null);
  const param = url?.searchParams.get('lang');
  if (isLocale(param)) return param;
  return cookie ? localeOr(request.cookies.get(LOCALE_COOKIE)?.value) : localeOr(null);
}
