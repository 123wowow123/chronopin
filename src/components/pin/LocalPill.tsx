'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/client/i18n';
import { viewerPlace } from '@/lib/client/viewerPlace';
import { distanceKm } from '@/lib/distance';
import { RefineLink } from './RefineLink';

// How close counts as local: 100 miles, a day-trip radius.
const LOCAL_MILES = 100;
const LOCAL_KM = LOCAL_MILES * 1.609344;

// The "Local" pill on a card, searching within:me, the pins within 100 miles of the viewer. It shows only once the
// viewer's browser knows where they are and the pin stands within LOCAL_KM of
// that; unknown (a crawler, a refused lookup) or farther away, it is left out.
export function LocalPill({ latitude, longitude, className }: { latitude: number; longitude: number; className: string }) {
  const t = useT();
  const [local, setLocal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void viewerPlace().then((place) => {
      if (cancelled || !place) return;
      setLocal(distanceKm(place, { latitude, longitude }) <= LOCAL_KM);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (!local) return null;
  return (
    <RefineLink field="within" value="me" className={className}>
      {t('card.local')}
    </RefineLink>
  );
}
