'use client';

import Link from '@/components/ui/Link';
import { PinThumb } from '@/components/pin/PinThumb';
import { Icon } from '@/components/ui/Icon';
import { compactCount } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import type { TrendingPin } from '@/lib/types';
import { useT } from '@/lib/client/i18n';
import { PlacePills } from './CityPill';
import { StartsWhen } from './StartsWhen';
import { pinTextDir } from '@/lib/i18n/config';

// How much a pin's views grew on the stretch before, as a percentage; nothing
// when nobody viewed it then.
function growth(pin: TrendingPin): string | null {
  if (!pin.previousViews) return null;
  return `+${Math.round(((pin.views - pin.previousViews) / pin.previousViews) * 100)}%`;
}

// The most viewed pins whose views are rising, beside the timeline on wide
// screens. Nothing shows until some pin is trending.
//
// It shares the column with new pins: both start at their heading and one row
// (basis-28) and split what is left, each up to its full list, so a taller
// screen shows more of both.
export function TrendingPins({ pins, days }: { pins: TrendingPin[]; days: number }) {
  const t = useT();
  if (!pins.length) return null;
  return (
    <section aria-labelledby="trending-heading" className="floating flex max-h-max min-h-0 grow basis-28 flex-col text-sm">
      <h2 id="trending-heading" className="flex shrink-0 items-center gap-2 px-3.5 pt-2.5 pb-1.5">
        <Icon name="trending-up" className="size-4 text-success" />
        <span className="font-medium text-ink">{t('trending.heading')}</span>
        <span className="ms-auto text-xs text-subtle">{t('trending.lastDays', { count: days })}</span>
      </h2>
      {/* Only whole rows, never a scrollbar: a row that does not fit wraps into
          a second column, which the clipping hides. */}
      <ol className="flex min-h-0 flex-col flex-wrap overflow-clip pb-1.5">
        {pins.map((pin) => (
          <li key={pin.id} className="w-full px-1.5">
            <TrendingRow pin={pin} />
          </li>
        ))}
      </ol>
    </section>
  );
}

// One trending pin: its picture, title, views, how fast they grew, when it
// starts, and its category and city. Also the nav drawer's trending list
// (src/components/nav/DrawerHighlights.tsx).
export function TrendingRow({ pin }: { pin: TrendingPin }) {
  const t = useT();
  const grew = growth(pin);
  return (
    <Link href={pinPath(pin)} prefetch={false} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-raised">
      <PinThumb thumbName={pin.thumbName} originalUrl={pin.originalUrl} title={pin.title} category={pin.category} className="h-9 w-14" />
      <span className="flex min-w-0 flex-col">
        <span dir={pinTextDir(pin)} className="truncate leading-snug text-ink" title={pin.title}>
          {pin.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-subtle tabular-nums">
          <span className="shrink-0">{t('trending.views', { count: pin.views, compact: compactCount(pin.views) })}</span>
          {grew ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0 font-medium text-success">{grew}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="min-w-0 truncate">
            <StartsWhen utcStartDateTime={pin.utcStartDateTime} allDay={pin.allDay} />
          </span>
        </span>
        <PlacePills category={pin.category} city={pin.city} />
      </span>
    </Link>
  );
}
