// Whether the site is offered in its other languages (src/lib/i18n). Off by
// default (owner, 2026-09-23). Off, every page is English: the proxy sends /es/... and the rest to
// the plain English path and no longer follows the locale cookie or
// Accept-Language, the profile has no language picker, hreflang lists only
// English, and new or edited pins are not sent for translation. Stored
// translations and each account's saved language are kept for turning it back
// on. An admin setting - this is only its default.
export type MultilingualSetting = { enabled: boolean };

export const DEFAULT_MULTILINGUAL: MultilingualSetting = { enabled: false };

// A stored or submitted value as a setting, or the problem with it.
export function parseMultilingual(value: unknown): { setting: MultilingualSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
