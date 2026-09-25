'use client';

import { useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { useRouter, useSearchParams } from '@/lib/client/navigation';
import { backToTimeline, dayTrip } from '@/lib/client/dayReturn';

// On a day's search opened from the timeline's "View all": the way back to
// the spot the timeline was left at (src/lib/client/dayReturn.ts). Reached any
// other way, the page has no timeline spot behind it and shows no pill.
// `className` places it: the search page puts one wherever its other pinned
// controls are at each width, so it stays in reach as the day scrolls.
export function BackToTimeline({ className = '' }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  // Read again as the query changes: the pill is for the day's own search.
  useSearchParams();
  // The mark is in this browser's storage, which the server render cannot
  // see: none there, then read once hydrated.
  const shown = useSyncExternalStore(
    () => () => {},
    () => !!dayTrip(),
    () => false,
  );
  if (!shown) return null;
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => backToTimeline(router)}
        // The map's "Back to pin" (PinsMap): the same floating capsule and ink
        // words, so the site's ways back look alike. Grey words on it vanished
        // into the cards it floats over in the dark theme.
        className="floating flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-raised active:bg-raised-2"
      >
        <Icon name="back" className="size-4 text-link" />
        {t('timeline.backToTimeline')}
      </button>
    </div>
  );
}
