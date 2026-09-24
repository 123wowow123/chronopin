'use client';

import Link from '@/components/ui/Link';
import { PinThumb } from '@/components/pin/PinThumb';
import { Icon } from '@/components/ui/Icon';
import { useWholeRows } from '@/lib/client/wholeRows';
import { timeAgo } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import type { CardPin, NewPin } from '@/lib/types';
import { pinPicture } from '@/components/pin/PinThumb';
import { pinMarketRefs } from '@/lib/predictionMarkets';
import { MarketTrend } from './MarketTrend';
import { StartsWhen } from './StartsWhen';
import { useT } from '@/lib/client/i18n';
import { CategoryPill } from './CategoryPill';

// How many pins the new pins lists keep, matching the LIMIT newPins() in
// src/server/services/pages.ts asks for.
export const NEW_PINS_LIMIT = 5;

// A broadcast pin as the new pins lists show it.
function toNewPin(pin: CardPin): NewPin {
  return {
    id: pin.id,
    title: pin.title,
    category: pin.categories?.[0] ?? null,
    utcStartDateTime: pin.utcStartDateTime,
    allDay: pin.allDay,
    // A just-saved broadcast carries no utcCreatedDateTime (PinCard.tsx
    // guards the same gap); it was created now, so that is the best answer.
    utcCreatedDateTime: pin.utcCreatedDateTime ?? new Date().toISOString(),
    ...pinPicture(pin.media),
    hasMarket: pinMarketRefs(pin).length > 0,
  };
}

// A new pins list after one live pin event: a save joins the top, an edit
// updates its row, and a removal - or an edit that drops the pin below the
// timeline's confidence bar - takes it out. The timeline's panel and the nav
// drawer's list (src/components/nav/DrawerHighlights.tsx) both follow it.
export function withLivePin(list: NewPin[], type: string, changed: CardPin, belowBar: boolean): NewPin[] {
  if (type === 'pin:remove' || belowBar) return list.filter((p) => p.id !== changed.id);
  const index = list.findIndex((p) => p.id === changed.id);
  if (index === -1) {
    return type === 'pin:save' ? [toNewPin(changed), ...list].slice(0, NEW_PINS_LIMIT) : list;
  }
  if (type !== 'pin:update') return list;
  // An edit's broadcast is the form's pin: possibly no created time, so that
  // stays as the list had it, as does the category if it came without any.
  const next = [...list];
  next[index] = {
    ...toNewPin(changed),
    category: changed.categories ? (changed.categories[0] ?? null) : list[index].category,
    utcCreatedDateTime: list[index].utcCreatedDateTime,
  };
  return next;
}

// The pins added most recently, beside the timeline on wide screens, each with
// how long ago it was added, its category and when it starts. now is the timeline's ticking
// clock, so the ages agree between the server render and hydration.
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
            <NewPinRow pin={pin} now={now} />
          </li>
        ))}
      </ol>
    </section>
  );
}

// One new pin: its picture (or its market's trend), title, how long ago it was
// added, its category and when it starts. Also the nav drawer's new pins list
// (src/components/nav/DrawerHighlights.tsx).
export function NewPinRow({ pin, now }: { pin: NewPin; now: number }) {
  const t = useT();
  return (
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
            {t('newPins.postedAgo', {
              ago: timeAgo(pin.utcCreatedDateTime, Math.max(now, Date.parse(pin.utcCreatedDateTime)), t.locale, { numeric: 'always', decimals: true }),
            })}
          </time>
          {pin.category ? <CategoryPill category={pin.category} /> : null}
        </span>
        <StartsWhen utcStartDateTime={pin.utcStartDateTime} allDay={pin.allDay} />
      </span>
    </Link>
  );
}
