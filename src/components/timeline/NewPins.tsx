'use client';

import Link from '@/components/ui/Link';
import { PinThumb } from '@/components/pin/PinThumb';
import { Icon } from '@/components/ui/Icon';
import { useWholeRows } from '@/lib/client/wholeRows';
import { timeAgo } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import type { NewPin } from '@/lib/types';
import { MarketTrend } from './MarketTrend';
import { useT } from '@/lib/client/i18n';

// The pins added most recently, beside the timeline on wide screens, each with
// who added it and how long ago. now is the timeline's ticking clock, so the
// ages agree between the server render and hydration.
//
// Trending comes first: this panel starts at its heading and one row (basis-28)
// and grows into what trending leaves, up to its full list. When not even that
// much is left under the whole of trending, it wraps out of sight.
export function NewPins({ pins, now }: { pins: NewPin[]; now: number }) {
  const ref = useWholeRows<HTMLElement>(pins);
  const t = useT();
  if (!pins.length) return null;
  return (
    <section ref={ref} aria-labelledby="new-pins-heading" className="floating flex max-h-max min-h-0 grow basis-28 flex-col text-sm">
      <h2 id="new-pins-heading" className="flex shrink-0 items-center gap-2 px-3.5 pt-2.5 pb-1.5">
        <Icon name="sparkle" className="size-4 text-link" />
        <span className="font-medium text-ink">{t('newPins.heading')}</span>
        <span className="ml-auto text-xs text-subtle">{t('newPins.latest')}</span>
      </h2>
      {/* Only whole rows, never a scrollbar: a row that does not fit wraps into
          a second column, which the clipping hides. */}
      <ol className="flex min-h-0 flex-col flex-wrap overflow-clip pb-1.5">
        {pins.map((pin) => (
          <li key={pin.id} className="w-full px-1.5">
            <Link href={pinPath(pin)} prefetch={false} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-raised hover:no-underline">
              {pin.hasMarket ? (
                <MarketTrend pinId={pin.id} fallback={<PinThumb thumbName={pin.thumbName} originalUrl={pin.originalUrl} className="h-9 w-14" />} />
              ) : (
                <PinThumb thumbName={pin.thumbName} originalUrl={pin.originalUrl} className="h-9 w-14" />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 leading-snug text-ink" title={pin.title}>
                  {pin.title}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-subtle">
                  {/* The same pulsing dot the pin's odds show: it cites a
                      Kalshi or Polymarket market, so has a live odds feed. */}
                  {pin.hasMarket ? (
                    <span title={t('newPins.liveOdds')} className="size-1.5 shrink-0 animate-pulse rounded-full bg-success motion-reduce:animate-none">
                      <span className="sr-only">{t('newPins.liveOdds')}</span>
                    </span>
                  ) : null}
                  <time dateTime={pin.utcCreatedDateTime} className="shrink-0">
                    {/* now ticks each minute, so a pin pushed in since the last
                        tick would otherwise read "in 3 seconds". */}
                    {timeAgo(pin.utcCreatedDateTime, Math.max(now, Date.parse(pin.utcCreatedDateTime)), t.locale)}
                  </time>
                  {pin.userName ? <span className="truncate">· {pin.userName}</span> : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
