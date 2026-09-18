import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMELINE_VIDEO, parseTimelineVideo, showsStill } from './timelineVideo';

describe('timelineVideo', () => {
  it('shows the still picture on every screen until an admin says otherwise', () => {
    expect(DEFAULT_TIMELINE_VIDEO).toEqual({ mobile: false, desktop: false });
  });

  it('accepts either answer for each screen', () => {
    expect(parseTimelineVideo({ mobile: true, desktop: false })).toEqual({ setting: { mobile: true, desktop: false } });
    expect(parseTimelineVideo({ mobile: false, desktop: true })).toEqual({ setting: { mobile: false, desktop: true } });
  });

  it('gives a row saved before desktop existed the default for wide screens', () => {
    expect(parseTimelineVideo({ mobile: true })).toEqual({ setting: { mobile: true, desktop: false } });
  });

  it('rejects anything else, so a bad row falls back to the default', () => {
    for (const bad of [null, undefined, [], {}, 'true', { mobile: 'yes' }, { mobile: 1 }, { mobile: true, desktop: 'no' }]) {
      expect(parseTimelineVideo(bad)).toHaveProperty('problem');
    }
  });
});

describe('showsStill', () => {
  it('follows the setting for a known screen', () => {
    const setting = { mobile: false, desktop: true };
    expect(showsStill(setting, 'mobile')).toBe(true);
    expect(showsStill(setting, 'desktop')).toBe(false);
    expect(showsStill({ mobile: true, desktop: false }, 'desktop')).toBe(true);
  });

  it('renders the still before the screen is known whenever either screen wants it', () => {
    expect(showsStill({ mobile: false, desktop: true }, 'unknown')).toBe(true);
    expect(showsStill({ mobile: true, desktop: false }, 'unknown')).toBe(true);
    expect(showsStill({ mobile: false, desktop: false }, 'unknown')).toBe(true);
    expect(showsStill({ mobile: true, desktop: true }, 'unknown')).toBe(false);
  });
});
