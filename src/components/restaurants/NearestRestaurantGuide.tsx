'use client';

import { useEffect } from 'react';
import Link from '@/components/ui/Link';
import { useRouter } from '@/lib/client/navigation';
import { forgetViewerPlace, viewerPlace } from '@/lib/client/viewerPlace';
import { nearestRestaurantRegion } from '@/lib/restaurants';

export function NearestRestaurantGuide() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    forgetViewerPlace();
    // A time zone spans many cities; it cannot tell us which guide is closest.
    viewerPlace().then((place) => {
      if (active) router.replace(`/restaurants/${nearestRestaurantRegion(place?.source === 'timeZone' ? null : place).slug}`);
    }).catch(() => {
      if (active) router.replace('/restaurants/san-diego');
    });
    return () => { active = false; };
  }, [router]);
  return (
    <main className="mx-auto min-h-[75vh] max-w-7xl px-6 py-16">
      <p role="status" className="text-muted">Finding your nearest restaurant guide…</p>
      <Link href="/restaurants/san-diego" className="mt-4 inline-block text-primary">Browse San Diego</Link>
    </main>
  );
}
