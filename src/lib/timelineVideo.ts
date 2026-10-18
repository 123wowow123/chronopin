// Whether a pin card loads its video player, on a phone and on a wider
// screen. Otherwise it shows the video's still picture. A YouTube embed is by
// far the heaviest thing a card pulls in, and a timeline, a page of results or
// a "More like this" grid is a set of cards nobody asked to play; the pin's
// own page always plays.
// An admin setting - this is only its default.
export type TimelineVideoSetting = { mobile: boolean; desktop: boolean };

export const DEFAULT_TIMELINE_VIDEO: TimelineVideoSetting = { mobile: false, desktop: false };

// The screen a card is on, or 'unknown' before the browser has said (on the
// server and during hydration).
export type ScreenSize = 'mobile' | 'desktop' | 'unknown';

// Whether a card shows a video as its still instead of its player. Before the
// screen is known the still wins whenever either screen wants it: an iframe in
// the HTML is already a download, while a still costs only a swap.
export function showsStill(setting: TimelineVideoSetting, screen: ScreenSize): boolean {
  if (screen === 'unknown') {
    return !setting.mobile || !setting.desktop;
  }
  return !setting[screen];
}

// Below this width a card counts as being on a phone. Tailwind's `sm`, the
// same bound the cards size their images by (CARD_SIZES).
export const MOBILE_WIDTH_QUERY = '(width < 40rem)';

// A stored or submitted value as a setting, or the problem with it.
export function parseTimelineVideo(value: unknown): { setting: TimelineVideoSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { mobile, desktop }' };
  }
  // desktop came later: a row saved before it was never a choice about wide
  // screens, so it takes the default.
  const { mobile, desktop = DEFAULT_TIMELINE_VIDEO.desktop } = value as Record<string, unknown>;
  if (typeof mobile !== 'boolean') {
    return { problem: 'mobile must be true or false' };
  }
  if (typeof desktop !== 'boolean') {
    return { problem: 'desktop must be true or false' };
  }
  return { setting: { mobile, desktop } };
}
