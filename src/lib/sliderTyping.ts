// Whether the filter sliders (posted within, distance, time span) offer a
// typed box and a row of preset chips under the track, or only the track.
// Off by default: the track already steps through every preset, and the box
// and chips double the panel for a precision few viewers reach for.
// An admin setting - this is only its default.
export type SliderTypingSetting = { enabled: boolean };

export const DEFAULT_SLIDER_TYPING: SliderTypingSetting = { enabled: false };

// A stored or submitted value as a setting, or the problem with it.
export function parseSliderTyping(value: unknown): { setting: SliderTypingSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
