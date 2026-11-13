// Which pins are too thin for search engines to index. AdSense turned the
// site down as "low value content" (Oct 2026), and Google's thin-content
// policy counts every indexed page: a pin page with a two-line summary or one
// lone source drags down the rest. Such a pin keeps its page, says
// "noindex, follow" and stays out of the sitemap while the admin setting is on
// (/admin/search). The SQL twin of this rule is THIN_PIN_SQL in
// src/server/model/searchIssues.ts; keep the two in step.
import { plainText } from './format';
import { DEFAULT_LOCALE, READERS_MILLIONS, type Locale } from './i18n/config';
import type { PinJson } from './types';

// The fewest characters of summary text (description and long-form summary,
// tags stripped) a pin needs. On prod the median is ~1,700 and the bottom
// tenth ~840. Raised from 600 / 2 sources on 2026-10-12: Search Console had
// 1,174 pages "crawled - currently not indexed", and the English ones that
// passed the old floor sat at 750-1,400 characters.
export const THIN_TEXT_CHARS = 900;
// The fewest cited pages (its source plus its references) a pin needs.
export const MIN_SOURCES = 3;

// The higher bar for its translated pages to be indexed. 97% of those not
// indexed were non-English copies (about 137,000 hreflang alternates for ~8,300
// sitemap URLs); until the English side has the authority, only the strongest
// pins ask for their translations to be indexed. A pin under it keeps its
// translated pages (viewers get them) as "noindex, follow", with no hreflang.
export const TRANSLATION_TEXT_CHARS = 1200;
export const TRANSLATION_MIN_SOURCES = 3;

export type ThinReason = 'shortText' | 'oneSource';

export const THIN_REASON_LABELS: Record<ThinReason, string> = {
  shortText: 'Short text',
  oneSource: 'One source',
};

// The pin's summary text length, as a reader sees it.
export function pinTextLength(pin: Pick<PinJson, 'description' | 'longFormSummary'>): number {
  return plainText(pin.description).length + plainText(pin.longFormSummary).length;
}

// Its cited pages: the source, and each reference that is not the source again
// (as pinEvidence lists them).
export function pinSourceCount(pin: Pick<PinJson, 'sourceUrl' | 'references'>): number {
  const source = pin.sourceUrl?.trim();
  const others = (pin.references || []).filter((r) => r.url !== source).length;
  return (source ? 1 : 0) + others;
}

// Why a pin is thin; empty when it is not. Judge the English pin: a Chinese
// or Japanese translation says as much in far fewer characters.
export function thinReasons(pin: Pick<PinJson, 'description' | 'longFormSummary' | 'sourceUrl' | 'references'>): ThinReason[] {
  const reasons: ThinReason[] = [];
  if (pinTextLength(pin) < THIN_TEXT_CHARS) reasons.push('shortText');
  if (pinSourceCount(pin) < MIN_SOURCES) reasons.push('oneSource');
  return reasons;
}

// Minimum sitewide pin demand (total views across PinView) before a non-English
// translation is indexed, scaled by the language's reader base (READERS_MILLIONS):
// ambient automated views already put low-demand pins around 10-30 total views
// across locales, so only pins with proven demand above that floor invite
// Google to index translated copies, starting with the largest languages.
export const MAJOR_LOCALE_MIN_VIEWS = 35; // READERS_MILLIONS >= 250 (zh, es, hi, fr, ar, id)
export const MID_LOCALE_MIN_VIEWS = 45;   // READERS_MILLIONS >= 120 (ru, pt, de, ja)
export const TAIL_LOCALE_MIN_VIEWS = 60;  // READERS_MILLIONS < 120 (vi, ko, ms, it, th)
export const MAJOR_LOCALE_READERS_M = 250;
export const MID_LOCALE_READERS_M = 120;
export const TRANSLATION_MIN_FAVORITES = 1;

export type PinDemand = { viewCount?: number | null; favoriteCount?: number | null };

// Total view threshold required for indexing a translated page in `locale`.
export function minViewsForLocale(locale: Locale): number {
  if (locale === DEFAULT_LOCALE) return 0;
  const readers = READERS_MILLIONS[locale] ?? 0;
  if (readers >= MAJOR_LOCALE_READERS_M) return MAJOR_LOCALE_MIN_VIEWS;
  if (readers >= MID_LOCALE_READERS_M) return MID_LOCALE_MIN_VIEWS;
  return TAIL_LOCALE_MIN_VIEWS;
}

// Which offered non-English locales qualify for indexing from precomputed
// translation eligibility (`translatable`), demand signals, and stored
// translations (`translatedLocales`). Shared by pin metadata and sitemap.ts.
export function indexableLocalesFromSignals<L extends Locale>(
  translatable: boolean,
  demand: PinDemand,
  offered: readonly L[],
  translatedLocales?: readonly string[] | null,
): L[] {
  if (!translatable) return [];
  const views = demand.viewCount ?? 0;
  const favs = demand.favoriteCount ?? 0;
  return offered.filter((locale) => {
    if (locale === DEFAULT_LOCALE) return false;
    if (translatedLocales && !translatedLocales.includes(locale)) return false;
    return favs >= TRANSLATION_MIN_FAVORITES || views >= minViewsForLocale(locale);
  });
}

// Which offered non-English locales should be indexed for this pin (and listed
// in hreflang/sitemap), judged on the English pin's quality and demand.
export function indexablePinLocales<L extends Locale>(
  pin: Pick<PinJson, 'description' | 'longFormSummary' | 'sourceUrl' | 'references'> & PinDemand,
  offered: readonly L[],
  translatedLocales?: readonly string[] | null,
): L[] {
  return indexableLocalesFromSignals(translationReady(pin), pin, offered, translatedLocales);
}

// Whether the pin's translated pages pass the base text/source floor: judged,
// like thinReasons, on the English pin. The SQL twin is TRANSLATABLE_PIN_SQL.
export function translationReady(pin: Pick<PinJson, 'description' | 'longFormSummary' | 'sourceUrl' | 'references'>): boolean {
  return thinReasons(pin).length === 0 && pinTextLength(pin) >= TRANSLATION_TEXT_CHARS && pinSourceCount(pin) >= TRANSLATION_MIN_SOURCES;
}

// The admin setting: whether thin pins, and the translations of pins under the
// translation bar, ask search engines not to index them. On by default.
export type HideThinPinsSetting = { enabled: boolean };

export const DEFAULT_HIDE_THIN_PINS: HideThinPinsSetting = { enabled: true };

export function parseHideThinPins(value: unknown): { setting: HideThinPinsSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
