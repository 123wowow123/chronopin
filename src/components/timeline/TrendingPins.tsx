'use client';

import Link from 'next/link';
import { PinThumb } from '@/components/pin/PinThumb';
import { Icon } from '@/components/ui/Icon';
import { useWholeRows } from '@/lib/client/wholeRows';
import { compactCount, pluralize } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import type { TrendingPin } from '@/lib/types';

// How much a pin's views grew on the stretch before: a percentage, or "new"
// when nobody viewed it then.
function growth(pin: TrendingPin): string {
  if (!pin.previousViews) return 'New';
  return `+${Math.round(((pin.views - pin.previousViews) / pin.previousViews) * 100)}%`;
}

// The most viewed pins whose views are rising, beside the timeline on wide
// screens. Nothing shows until some pin is trending.
export function TrendingPins({ pins, days }: { pins: TrendingPin[]; days: number }) {
  const ref = useWholeRows<HTMLElement>(pins);
  if (!pins.length) return null;
  return (
    <section ref={ref} aria-labelledby="trending-heading" className="floating flex min-h-0 flex-col text-sm">
      <h2 id="trending-heading" className="flex shrink-0 items-center gap-2 px-3.5 pt-2.5 pb-1.5">
        <Icon name="trending-up" className="size-4 text-success" />
        <span className="font-medium text-ink">Trending</span>
        <span className="ml-auto text-xs text-subtle">Last {pluralize('day', days)}</span>
      </h2>
      {/* Only whole rows, never a scrollbar: a row that does not fit wraps into
          a second column, which the clipping hides. */}
      <ol className="flex min-h-0 flex-col flex-wrap overflow-clip pb-1.5">
        {pins.map((pin) => (
          <li key={pin.id} className="w-full px-1.5">
            <Link href={pinPath(pin)} prefetch={false} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-raised">
              <PinThumb thumbName={pin.thumbName} originalUrl={pin.originalUrl} className="h-9 w-14" />
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 leading-snug text-ink" title={pin.title}>
                  {pin.title}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-subtle tabular-nums">
                  {compactCount(pin.views)} {pluralize('view', pin.views, false)}
                  <span className="font-medium text-success">{growth(pin)}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
