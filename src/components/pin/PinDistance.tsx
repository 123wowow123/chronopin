'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { viewerPlace } from '@/lib/client/viewerPlace';
import { distanceKm, formatDistance } from '@/lib/distance';
import { usesImperial } from '@/lib/weather';

// How far the pin's place is from the viewer. A distance the viewer's own
// browser worked out, so it says where it was measured from whenever that is
// the city of their time zone rather than their position. Nothing at all when
// neither is known (a crawler, UTC, a refused lookup).
//
// It links to the map, which draws the line it was measured along (see
// PinsMap's from=me). Only the viewer's browser knows where they are, so the
// link says to measure from them rather than carrying coordinates a shared
// URL would hand on.
//
// Under a pin's map it is a line of its own; `compact` is the card's meta
// row, where it is one dotted item among several and the place it was
// measured from moves to the title. There it is also the item that gives: it
// measures nothing for the row's wrapping (a zero basis), takes what the
// items before it leave and is cut short there, so a long distance never
// costs the card a second line of meta. Below 5rem there is nothing left to
// read, so that is its floor, and a row with less to spare wraps it onto a
// line of its own whole rather than showing a sliver of it.
export function PinDistance({ pinId, latitude, longitude, compact }: { pinId: number; latitude: number; longitude: number; compact?: boolean }) {
  const [text, setText] = useState<{ away: string; from: string } | null>(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    void viewerPlace().then((place) => {
      if (cancelled || !place) return;
      const distance = formatDistance(distanceKm(place, { latitude, longitude }), usesImperial(), t.locale);
      const away = t('pin.distanceAway', { distance });
      setText({ away, from: place.name ? t('pin.distanceFrom', { distance, place: place.name }) : away });
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, t]);

  if (!text) return null;
  const href = `/map?pin=${pinId}&from=me`;
  if (compact) {
    return (
      <Link href={href} title={t('pin.distanceOnMap')} className="min-w-20 flex-1 truncate text-inherit hover:text-ink hover:no-underline">
        {text.away}
      </Link>
    );
  }
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
      <Icon name="target" className="size-3.5 shrink-0" />
      <Link href={href} title={t('pin.distanceOnMap')} className="text-inherit hover:text-ink">
        {text.from}
      </Link>
    </p>
  );
}
