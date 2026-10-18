import { describe, expect, it } from 'vitest';
import { DEFAULT_HIDE_THIN_PINS, MIN_SOURCES, parseHideThinPins, pinSourceCount, pinTextLength, thinReasons, THIN_TEXT_CHARS, TRANSLATION_MIN_SOURCES, TRANSLATION_TEXT_CHARS, translationReady } from './searchQuality';

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

describe('parseHideThinPins', () => {
  it('is on by default and takes a boolean', () => {
    expect(DEFAULT_HIDE_THIN_PINS.enabled).toBe(true);
    expect(parseHideThinPins({ enabled: false })).toEqual({ setting: { enabled: false } });
    expect(parseHideThinPins({ enabled: 'no' })).toHaveProperty('problem');
  });
});
