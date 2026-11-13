import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HIDE_THIN_PINS,
  indexableLocalesFromSignals,
  indexablePinLocales,
  MAJOR_LOCALE_MIN_VIEWS,
  MID_LOCALE_MIN_VIEWS,
  MIN_SOURCES,
  minViewsForLocale,
  parseHideThinPins,
  pinSourceCount,
  pinTextLength,
  TAIL_LOCALE_MIN_VIEWS,
  THIN_TEXT_CHARS,
  thinReasons,
  TRANSLATION_MIN_FAVORITES,
  TRANSLATION_MIN_SOURCES,
  TRANSLATION_TEXT_CHARS,
  translationReady,
} from './searchQuality';

const long = 'x'.repeat(THIN_TEXT_CHARS);
const refs = (n: number) => Array.from({ length: n }, (_, i) => ({ url: `https://r${i}.example` })) as never;

describe('thinReasons', () => {
  it('passes a pin with enough text and enough cited pages', () => {
    expect(thinReasons({ description: long, sourceUrl: 'https://a.example', references: refs(MIN_SOURCES - 1) })).toEqual([]);
  });

  it('flags a pin one cited page short', () => {
    expect(thinReasons({ description: long, sourceUrl: 'https://a.example', references: refs(MIN_SOURCES - 2) })).toEqual(['oneSource']);
  });

  it('counts description and long-form summary together, tags stripped', () => {
    const half = 'y'.repeat(THIN_TEXT_CHARS / 2);
    expect(pinTextLength({ description: `<p>${half}</p>`, longFormSummary: `<b>${half}</b>` })).toBe(THIN_TEXT_CHARS);
  });

  it('does not count a reference that repeats the source', () => {
    expect(pinSourceCount({ sourceUrl: 'https://a.example', references: [{ url: 'https://a.example' }] as never })).toBe(1);
    expect(thinReasons({ description: long, sourceUrl: 'https://a.example', references: [{ url: 'https://a.example' }] as never })).toEqual(['oneSource']);
  });

  it('flags short text and a lone source together', () => {
    expect(thinReasons({ description: 'Short.', sourceUrl: 'https://a.example' })).toEqual(['shortText', 'oneSource']);
  });
});

describe('translationReady', () => {
  const rich = 'z'.repeat(TRANSLATION_TEXT_CHARS);
  it('needs the higher text and source bar', () => {
    expect(translationReady({ description: rich, sourceUrl: 'https://a.example', references: refs(TRANSLATION_MIN_SOURCES - 1) })).toBe(true);
    expect(translationReady({ description: long, sourceUrl: 'https://a.example', references: refs(TRANSLATION_MIN_SOURCES - 1) })).toBe(false);
    expect(translationReady({ description: rich, sourceUrl: 'https://a.example', references: refs(MIN_SOURCES - 2) })).toBe(false);
  });
});

describe('indexablePinLocales', () => {
  const rich = 'z'.repeat(TRANSLATION_TEXT_CHARS);
  const offered = ['zh', 'es', 'de', 'ja', 'th'] as const;

  it('scales view thresholds by locale reach', () => {
    expect(minViewsForLocale('en')).toBe(0);
    expect(minViewsForLocale('zh')).toBe(MAJOR_LOCALE_MIN_VIEWS);
    expect(minViewsForLocale('de')).toBe(MID_LOCALE_MIN_VIEWS);
    expect(minViewsForLocale('th')).toBe(TAIL_LOCALE_MIN_VIEWS);
  });

  it('withholds all translated locales for low-demand pins unless favorited', () => {
    const lowPin = { description: rich, sourceUrl: 'https://a.example', references: refs(TRANSLATION_MIN_SOURCES - 1), viewCount: MAJOR_LOCALE_MIN_VIEWS - 1, favoriteCount: 0 };
    expect(indexablePinLocales(lowPin, offered)).toEqual([]);

    const favPin = { ...lowPin, favoriteCount: TRANSLATION_MIN_FAVORITES };
    expect(indexablePinLocales(favPin, offered, ['zh', 'th'])).toEqual(['zh', 'th']);
  });

  it('unlocks locales progressively by demand and excludes untranslated locales', () => {
    const midPin = { description: rich, sourceUrl: 'https://a.example', references: refs(TRANSLATION_MIN_SOURCES - 1), viewCount: MID_LOCALE_MIN_VIEWS, favoriteCount: 0 };
    expect(indexablePinLocales(midPin, offered, ['zh', 'de', 'th'])).toEqual(['zh', 'de']);

    const highPin = { ...midPin, viewCount: TAIL_LOCALE_MIN_VIEWS };
    expect(indexablePinLocales(highPin, offered, ['zh', 'es', 'de', 'th'])).toEqual(['zh', 'es', 'de', 'th']);

    expect(indexableLocalesFromSignals(false, { viewCount: TAIL_LOCALE_MIN_VIEWS }, offered)).toEqual([]);
  });
});

describe('parseHideThinPins', () => {
  it('is on by default and takes a boolean', () => {
    expect(DEFAULT_HIDE_THIN_PINS.enabled).toBe(true);
    expect(parseHideThinPins({ enabled: false })).toEqual({ setting: { enabled: false } });
    expect(parseHideThinPins({ enabled: 'no' })).toHaveProperty('problem');
  });
});
