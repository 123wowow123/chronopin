import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMELINE_VIDEO, parseTimelineVideo } from './timelineVideo';

describe('timelineVideo', () => {
  it('leaves phones on the still picture until an admin says otherwise', () => {
    expect(DEFAULT_TIMELINE_VIDEO).toEqual({ mobile: false });
  });

  it('accepts either answer', () => {
    expect(parseTimelineVideo({ mobile: true })).toEqual({ setting: { mobile: true } });
    expect(parseTimelineVideo({ mobile: false })).toEqual({ setting: { mobile: false } });
  });

  it('rejects anything else, so a bad row falls back to the default', () => {
    for (const bad of [null, undefined, [], {}, 'true', { mobile: 'yes' }, { mobile: 1 }]) {
      expect(parseTimelineVideo(bad)).toHaveProperty('problem');
    }
  });
});
