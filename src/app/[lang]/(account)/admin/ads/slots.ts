import type { AdSlot } from '@/lib/ads';

// How an admin page names each ad placement.
export const SLOT_LABEL: Record<AdSlot, string> = {
  'timeline-row': 'Timeline, between days',
  'timeline-side': 'Timeline, side panel',
  'pin-strip': 'Pin page, under the tags',
  'pin-side': 'Pin page, under the comments',
  drawer: 'Mobile menu, above Log out',
};
