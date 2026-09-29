// Duplicate pins: the same event pinned more than once. Pairs are suggested
// on save and confirmed by people (src/server/services/duplicatePin.ts); a pin
// carries its confirmed group as duplicateGroup.

import type { PinJson } from './types';

type Ranked = Pick<PinJson, 'id' | 'favoriteCount' | 'viewCount' | 'likeCount' | 'utcCreatedDateTime'>;

// Which of a group shows first: most watched, then most viewed, then most
// liked, then the one posted first.
export function compareDuplicateRank(a: Ranked, b: Ranked): number {
  return (
    (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0) ||
    (b.viewCount ?? 0) - (a.viewCount ?? 0) ||
    (b.likeCount ?? 0) - (a.likeCount ?? 0) ||
    (a.utcCreatedDateTime ?? '').localeCompare(b.utcCreatedDateTime ?? '') ||
    a.id - b.id
  );
}

export type PinStack<T> = { pin: T; hidden: T[] };

// A day's pins with each confirmed group's members that are here collapsed
// into one stack: the top-ranked pin, in its own place in the order, with the
// rest behind it. A pin whose duplicates are elsewhere (another day, or not
// loaded) stands alone.
export function stackDuplicates<T extends Ranked & Pick<PinJson, 'duplicateGroup'>>(pins: T[]): PinStack<T>[] {
  const groups = new Map<number, T[]>();
  for (const pin of pins) {
    if (pin.duplicateGroup && pin.duplicateGroup.length > 1) {
      const key = pin.duplicateGroup[0];
      groups.set(key, [...(groups.get(key) ?? []), pin]);
    }
  }

  const stacks: PinStack<T>[] = [];
  for (const pin of pins) {
    const members = pin.duplicateGroup && pin.duplicateGroup.length > 1 ? groups.get(pin.duplicateGroup[0])! : [pin];
    const [top, ...hidden] = [...members].sort(compareDuplicateRank);
    if (top === pin) {
      stacks.push({ pin, hidden });
    }
  }
  return stacks;
}
