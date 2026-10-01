// Whether a pin is translated into the languages offered (src/lib/multilingual.ts)
// by Claude when it is saved or edited (src/server/events.ts). Off by default
// (owner, 2026-09-30): translations are made by hand rounds through
// /api/admin/translations, and until then a pin shows in English. An admin
// setting - this is only its default.
export type AutoTranslateSetting = { enabled: boolean };

export const DEFAULT_AUTO_TRANSLATE: AutoTranslateSetting = { enabled: false };

// A stored or submitted value as a setting, or the problem with it.
export function parseAutoTranslate(value: unknown): { setting: AutoTranslateSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: 'Expected { enabled }' };
  }
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') {
    return { problem: 'enabled must be true or false' };
  }
  return { setting: { enabled } };
}
