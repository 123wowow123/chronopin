import { describe, expect, it } from 'vitest';
import { DEFAULT_HIDE_THIN_PINS, parseHideThinPins, pinSourceCount, pinTextLength, thinReasons, THIN_TEXT_CHARS } from './searchQuality';

const long = 'x'.repeat(THIN_TEXT_CHARS);

describe('thinReasons', () => {
  it('passes a pin with enough text and two cited pages', () => {
    expect(thinReasons({ description: long, sourceUrl: 'https://a.example', references: [{ url: 'https://b.example' }] as never })).toEqual([]);
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

describe('parseHideThinPins', () => {
  it('is on by default and takes a boolean', () => {
    expect(DEFAULT_HIDE_THIN_PINS.enabled).toBe(true);
    expect(parseHideThinPins({ enabled: false })).toEqual({ setting: { enabled: false } });
    expect(parseHideThinPins({ enabled: 'no' })).toHaveProperty('problem');
  });
});
