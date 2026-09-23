// The languages Chronopin speaks, and how a page's URL says which one.
//
// English is the default and keeps the plain paths (/pin/1/x); every other
// language lives under its code (/es/pin/1/x). src/proxy.ts rewrites a plain
// path to the /en tree the app routes under (src/app/[lang]), so each language
// renders and caches as its own page and crawlers find every one of them.

export const LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Set by the language picker, so a plain link opens in the chosen language.
export const LOCALE_COOKIE = 'locale';

// Each language named in itself, for the picker.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '简体中文',
};

// The tag Intl formats dates and numbers with, and <html lang> / hreflang say.
// English keeps en-US, the month-first dates it has always shown.
export const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-US',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ja: 'ja',
  zh: 'zh-CN',
};

// The language Claude is asked to translate a pin into.
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  zh: 'Simplified Chinese',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function localeOr(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  return isLocale(value) ? value : fallback;
}

// "/es/map" -> { locale: 'es', path: '/map' }; a plain "/map" has no locale.
// "/en/map" reads as English too, though the proxy redirects it to "/map".
export function splitLocale(pathname: string): { locale: Locale | null; path: string } {
  const match = /^\/([a-z]{2})(?=\/|$)(.*)$/.exec(pathname);
  if (match && isLocale(match[1])) {
    return { locale: match[1], path: match[2] || '/' };
  }
  return { locale: null, path: pathname };
}

// A path within the app as a link in a language: "/map" -> "/es/map", and
// untouched in English. Leaves alone what is not an app page: other sites,
// API and auth routes, fragments, and paths already in a language.
export function localizePath(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !href.startsWith('/') || href.startsWith('//')) {
    return href;
  }
  if (/^\/(?:api|auth|logout|og|upload|_next)(?:[/?#]|$)/.test(href) || splitLocale(href.replace(/[?#].*$/, '')).locale) {
    return href;
  }
  if (href === '/') return `/${locale}`;
  if (/^\/[?#]/.test(href)) return `/${locale}${href.slice(1)}`;
  return `/${locale}${href}`;
}

// The best supported language for an Accept-Language header, or null.
// "fr-CA,fr;q=0.9,en;q=0.8" -> 'fr'; quality 0 means "not this one".
export function negotiateLocale(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => /^\s*q=([\d.]+)/.exec(p)?.[1]).find(Boolean);
      return { tag: tag.trim().toLowerCase(), q: q === undefined ? 1 : Number(q), index };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return null;
}

// A page's canonical path in its language, and the same page in the others
// (hreflang), for its metadata. x-default is the English page. With the other
// languages switched off (src/lib/multilingual.ts) there are none to list.
export function languageAlternates(path: string, locale: Locale, multilingual = true): { canonical: string; languages?: Record<string, string> } {
  if (!multilingual) return { canonical: localizePath(path, locale) };
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[INTL_LOCALES[l]] = localizePath(path, l);
  languages['x-default'] = localizePath(path, DEFAULT_LOCALE);
  return { canonical: localizePath(path, locale), languages };
}
