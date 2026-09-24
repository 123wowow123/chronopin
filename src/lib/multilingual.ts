// Which of the site's other languages (src/lib/i18n) are offered. None by
// default (owner, 2026-09-23); Chinese alone since 2026-09-24. A language not
// offered is English: the proxy sends /es/... to the plain English path and
// does not follow a locale cookie or Accept-Language to it, the profile's
// picker leaves it out, hreflang does not list it, and new or edited pins are
// not translated into it. Its stored translations and the accounts that chose
// it are kept for offering it again. An admin setting - this is only its
// default.

import { DEFAULT_LOCALE, LOCALES, type Locale } from './i18n/config';

export type OtherLocale = Exclude<Locale, 'en'>;
export const OTHER_LOCALES = LOCALES.filter((l): l is OtherLocale => l !== DEFAULT_LOCALE);

export type MultilingualSetting = { locales: OtherLocale[] };

// How many live pins each language has a current translation of, out of all
// of them (services/translations.ts translationCoverage).
export type TranslationCoverage = { total: number; current: Record<OtherLocale, number> };

export const DEFAULT_MULTILINGUAL: MultilingualSetting = { locales: [] };

// Whether a page may be shown in the language. English always is.
export function isOffered(locales: readonly OtherLocale[], locale: Locale): boolean {
  return locale === DEFAULT_LOCALE || (locales as readonly Locale[]).includes(locale);
}

// A stored or submitted value as a setting, or the problem with it. The first
// form of the setting, { enabled }, reads as every language or none.
export function parseMultilingual(value: unknown): { setting: MultilingualSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { locales }' };
  }
  const { locales, enabled } = value as Record<string, unknown>;
  if (locales === undefined && typeof enabled === 'boolean') {
    return { setting: { locales: enabled ? [...OTHER_LOCALES] : [] } };
  }
  if (!Array.isArray(locales)) {
    return { problem: 'locales must be a list of language codes' };
  }
  const unknown = locales.filter((l) => !(OTHER_LOCALES as readonly unknown[]).includes(l));
  if (unknown.length) {
    return { problem: `Not another language of the site: ${unknown.join(', ')}` };
  }
  return { setting: { locales: OTHER_LOCALES.filter((l) => locales.includes(l)) } };
}
