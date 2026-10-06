// Whether the map offers its web of related-pin lines (and the graph panel
// beside it): the toggle, legend and ?web= links. Off by default: the lines
// are a dense, exploratory view most visitors never reach for.
// An admin setting - this is only its default.
export type WebOverlaySetting = { enabled: boolean };

export const DEFAULT_WEB_OVERLAY: WebOverlaySetting = { enabled: false };

// A stored or submitted value as a setting, or the problem with it.
export function parseWebOverlay(value: unknown): { setting: WebOverlaySetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
