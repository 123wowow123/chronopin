// Whether the main timeline shows ad blocks: the row between days and the
// panel under "New pins". Off by default; the pin page's ad slots are not
// affected. An admin setting - this is only its default.
export type TimelineAdsSetting = { enabled: boolean };

export const DEFAULT_TIMELINE_ADS: TimelineAdsSetting = { enabled: false };

// A stored or submitted value as a setting, or the problem with it.
export function parseTimelineAds(value: unknown): { setting: TimelineAdsSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
