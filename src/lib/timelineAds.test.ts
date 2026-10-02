import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMELINE_ADS, parseTimelineAds } from './timelineAds';

describe('timelineAds', () => {
  it('is off by default', () => {
    expect(DEFAULT_TIMELINE_ADS).toEqual({ enabled: false });
  });

  it('parses a boolean', () => {
    expect(parseTimelineAds({ enabled: true })).toEqual({ setting: { enabled: true } });
    expect(parseTimelineAds({ enabled: false })).toEqual({ setting: { enabled: false } });
  });

  it('rejects anything else', () => {
    for (const bad of [null, [], 'yes', {}, { enabled: 'true' }]) {
      expect(parseTimelineAds(bad)).toHaveProperty('problem');
    }
  });
});
