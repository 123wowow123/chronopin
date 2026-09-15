import { describe, expect, it } from 'vitest';
import { minConfidence, parseTimelineConfidence } from './timelineConfidence';

describe('minConfidence', () => {
  it('is the threshold when filtering is on, and null when it is off', () => {
    expect(minConfidence({ enabled: true, threshold: 55 })).toBe(55);
    expect(minConfidence({ enabled: false, threshold: 55 })).toBeNull();
  });
});

describe('parseTimelineConfidence', () => {
  it('accepts whole-number thresholds from 0 to 100', () => {
    expect(parseTimelineConfidence({ enabled: true, threshold: 0 })).toEqual({ setting: { enabled: true, threshold: 0 } });
    expect(parseTimelineConfidence({ enabled: false, threshold: 100 })).toEqual({ setting: { enabled: false, threshold: 100 } });
  });

  it('rejects anything else', () => {
    for (const bad of [null, [], {}, { enabled: 'yes', threshold: 70 }, { enabled: true, threshold: 70.5 }, { enabled: true, threshold: 101 }, { enabled: true, threshold: -1 }, { enabled: true, threshold: '70' }]) {
      expect(parseTimelineConfidence(bad)).toHaveProperty('problem');
    }
  });
});
