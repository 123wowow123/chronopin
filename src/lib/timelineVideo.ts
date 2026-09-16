// Whether a card on the timeline loads its video player on a phone. A YouTube
// embed is by far the heaviest thing a card pulls in, and a timeline is a
// column of cards nobody asked to play; the pin's own page always plays.
// An admin setting - this is only its default.
export type TimelineVideoSetting = { mobile: boolean };

export const DEFAULT_TIMELINE_VIDEO: TimelineVideoSetting = { mobile: false };

// Below this width a card counts as being on a phone. Tailwind's `sm`, the
// same bound the cards size their images by (CARD_SIZES).
export const MOBILE_WIDTH_QUERY = '(width < 40rem)';

// A stored or submitted value as a setting, or the problem with it.
export function parseTimelineVideo(value: unknown): { setting: TimelineVideoSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { mobile }' };
  }
  const { mobile } = value as Record<string, unknown>;
  if (typeof mobile !== 'boolean') {
    return { problem: 'mobile must be true or false' };
  }
  return { setting: { mobile } };
}
