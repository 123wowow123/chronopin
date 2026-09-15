import { describe, expect, it } from 'vitest';
import { HALF_LIFE_DAYS, pinConfidence, pinEvidence, SOURCE_CONFIDENCE, weighReferences } from './referenceConfidence';

describe('pinConfidence', () => {
  it('is undefined without scored references', () => {
    expect(pinConfidence(undefined)).toBeUndefined();
    expect(pinConfidence([])).toBeUndefined();
  });

  it('is the plain average when references share a date', () => {
    expect(pinConfidence([
      { url: 'a', confidence: 90, publishedDate: '2026-01-01' },
      { url: 'b', confidence: 30, publishedDate: '2026-01-01' },
    ])).toBe(60);
  });

  it('counts a reference one half-life older half as much', () => {
    const newest = new Date('2026-06-30T00:00:00Z');
    const older = new Date(newest.getTime() - HALF_LIFE_DAYS * 86400000).toISOString().slice(0, 10);
    // (90 * 1 + 30 * 0.5) / 1.5 = 70
    expect(pinConfidence([
      { url: 'new', confidence: 90, publishedDate: '2026-06-30' },
      { url: 'old', confidence: 30, publishedDate: older },
    ])).toBe(70);
  });

  it('falls back to when the reference was added', () => {
    expect(pinConfidence([
      { url: 'new', confidence: 20, utcCreatedDateTime: '2026-09-01T00:00:00Z' },
      { url: 'ancient', confidence: 100, publishedDate: '2016-09-01' },
    ])).toBe(20);
  });
});

describe('weighReferences', () => {
  it('gives shares that sum to one, newest largest', () => {
    const weighed = weighReferences([
      { url: 'old', confidence: 30, publishedDate: '2026-01-01' },
      { url: 'new', confidence: 90, publishedDate: '2026-06-30' },
    ]);
    expect(weighed.map((w) => Math.round(w.share * 100))).toEqual([33, 67]);
  });
});

describe('pinEvidence', () => {
  const pin = { sourceUrl: 'https://src.com/a', dateConfidence: 'confirmed', utcCreatedDateTime: '2026-01-01T00:00:00Z' };

  it('counts the source, scored from its date confidence', () => {
    const evidence = pinEvidence(pin);
    expect(evidence).toEqual([{ url: 'https://src.com/a', isSource: true, confidence: SOURCE_CONFIDENCE.confirmed, utcCreatedDateTime: pin.utcCreatedDateTime }]);
    expect(pinConfidence(evidence)).toBe(90);
  });

  it('lists an unrated source without scoring it', () => {
    const evidence = pinEvidence({ ...pin, dateConfidence: undefined, references: [{ url: 'https://r.com', confidence: 40 }] });
    expect(evidence).toHaveLength(2);
    expect(pinConfidence(evidence)).toBe(40);
  });

  it('leaves the source out when a reference repeats it', () => {
    expect(pinEvidence({ ...pin, references: [{ url: 'https://src.com/a', confidence: 10 }] })).toEqual([{ url: 'https://src.com/a', confidence: 10 }]);
  });
});
