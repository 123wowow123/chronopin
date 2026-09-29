'use client';

import type { PinJson } from '@/lib/types';
import { useBlocks } from './blocks';
import { useNotInterested } from './notInterested';

type Card = Pick<PinJson, 'id' | 'user' | 'userId' | 'companyId'>;

// Whether the reader's timeline and search leave a pin's card out: its author
// is someone they blocked (0076), its company one they blocked (0078), or they
// marked it "Not interested" (0077) on an earlier page. One marked on this page stays, folded to a line with Undo
// (PinCard), so the grid does not jump under the pointer.
export function useLeftOut(): (pin: Card) => boolean {
  const blocks = useBlocks();
  const notInterested = useNotInterested();
  return (pin) => {
    const authorId = pin.user?.id ?? pin.userId;
    if (authorId != null && blocks.ids.has(authorId)) return true;
    if (pin.companyId != null && blocks.companyIds.has(pin.companyId)) return true;
    return notInterested.ids.has(pin.id) && !notInterested.justHidden.has(pin.id);
  };
}
