// Whether the tag panel in the filters (the drawer's on a phone, the xl
// column's, the lg tags pill's fold) lists its tags, or is only the button to
// the big tag cloud. Off by default (owner, 2026-09-22): the list is a wall of
// words on a phone, and a tap in it searched out from under the drawer; the
// big cloud is where tags are picked. An admin setting - this is only its
// default.
export type TagListSetting = { enabled: boolean };

export const DEFAULT_TAG_LIST: TagListSetting = { enabled: false };

// A stored or submitted value as a setting, or the problem with it.
export function parseTagList(value: unknown): { setting: TagListSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
