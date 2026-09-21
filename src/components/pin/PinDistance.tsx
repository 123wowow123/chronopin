'use client';

import { useEffect, useState } from 'react';
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
// Under a pin's map it is a line of its own; `compact` is the card's meta
// row, where it is one dotted item among several and the place it was
// measured from moves to the title.
export function PinDistance({ latitude, longitude, compact }: { latitude: number; longitude: number; compact?: boolean }) {
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
  if (compact) {
    return <span title={text.from}>{text.away}</span>;
  }
  return (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
      <Icon name="target" className="size-3.5 shrink-0" />
      {text.from}
    </p>
  );
}
