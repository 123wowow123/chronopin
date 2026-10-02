import { describe, expect, it } from 'vitest';
import { DEFAULT_AD_PLACEMENTS, parseAdPlacements } from './adPlacements';

describe('adPlacements', () => {
  it('has only the between-days timeline row off by default', () => {
    expect(DEFAULT_AD_PLACEMENTS).toEqual({ 'timeline-row': false, 'timeline-side': true, 'pin-strip': true, 'pin-side': true, drawer: true });
  });

  it('parses each placement on its own', () => {
    expect(parseAdPlacements({ ...DEFAULT_AD_PLACEMENTS, 'timeline-row': true, 'pin-side': false })).toEqual({
      setting: { 'timeline-row': true, 'timeline-side': true, 'pin-strip': true, 'pin-side': false, drawer: true },
    });
  });

  it('keeps the default for a placement left out', () => {
    expect(parseAdPlacements({ 'pin-strip': false })).toEqual({ setting: { ...DEFAULT_AD_PLACEMENTS, 'pin-strip': false } });
  });

  it('rejects anything else', () => {
    for (const bad of [null, [], 'yes', { 'pin-side': 'true' }]) {
      expect(parseAdPlacements(bad)).toHaveProperty('problem');
    }
  });
});
