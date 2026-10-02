import { AD_SLOTS, type AdSlot } from './ads';

// Which ad placements show their ads. An admin setting - this is only its
// default: the timeline's between-days row off, the other three on.
export type AdPlacementsSetting = Record<AdSlot, boolean>;

export const DEFAULT_AD_PLACEMENTS: AdPlacementsSetting = {
  'timeline-row': false,
  'timeline-side': true,
  'pin-strip': true,
  'pin-side': true,
};

// A stored or submitted value as a setting, or the problem with it. A slot
// left out keeps its default, so a placement added later starts as it should.
export function parseAdPlacements(value: unknown): { setting: AdPlacementsSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: `Expected { ${AD_SLOTS.join(', ')} }` };
  }
  const given = value as Record<string, unknown>;
  const setting = { ...DEFAULT_AD_PLACEMENTS };
  for (const slot of AD_SLOTS) {
    if (given[slot] === undefined) continue;
    if (typeof given[slot] !== 'boolean') {
      return { problem: `${slot} must be true or false` };
    }
    setting[slot] = given[slot];
  }
  return { setting };
}
