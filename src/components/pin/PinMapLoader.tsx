'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/client/i18n';
import { SiteShapeKey } from './SiteShapeKey';
import type { PinFlightPathJson } from '@/lib/types';
import type { PinSiteShapeJson } from '@/lib/siteShape';
import type { ThreadMapStop } from './ThreadMap';

// Leaflet touches window at import, so the map loads in the browser only.
const PinMap = dynamic(() => import('./PinMap'), {
  ssr: false,
  loading: () => <div className="h-[450px] w-full animate-pulse bg-raised" />,
});

// The pin's outline (a wildfire perimeter, district map, course) can be megabytes,
// so the page leaves it out: the map draws at once and the outline is fetched and
// added, with a quiet note while it comes.
export function PinMapLoader({ siteShapePinId, ...props }: { latitude: number; longitude: number; title: string; flightPath?: PinFlightPathJson; siteShapePinId?: number }) {
  const t = useT();
  const [shape, setShape] = useState<PinSiteShapeJson | null>(null);
  const [loading, setLoading] = useState(siteShapePinId != null);
  useEffect(() => {
    if (siteShapePinId == null) return;
    const controller = new AbortController();
    fetch(`/api/pins/${siteShapePinId}/site-shape`, { signal: controller.signal })
      .then((response) => (response.ok && response.status !== 204 ? (response.json() as Promise<PinSiteShapeJson>) : null))
      .then((data) => { setShape(data); setLoading(false); })
      .catch((error) => { if (error?.name !== 'AbortError') setLoading(false); });
    return () => controller.abort();
  }, [siteShapePinId]);
  return (
    <>
      <div className="relative">
        <PinMap {...props} siteShape={shape ?? undefined} />
        {loading ? (
          <div role="status" aria-live="polite" className="pointer-events-none absolute start-3 top-3 z-[1000] overflow-hidden rounded-full bg-panel/90 text-xs font-medium text-muted shadow-sm ring-1 ring-line backdrop-blur">
            <span className="flex items-center gap-2 px-3 py-1.5">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
              {t('pin.loadingOutline')}
            </span>
            <span aria-hidden className="block h-0.5 w-full animate-pulse bg-accent/40 motion-reduce:animate-none" />
          </div>
        ) : null}
      </div>
      {shape ? <SiteShapeKey shape={shape} t={t} /> : null}
    </>
  );
}

const ThreadMap = dynamic(() => import('./ThreadMap'), {
  ssr: false,
  loading: () => <div className="mt-4 h-[300px] w-full animate-pulse rounded-xl bg-raised" />,
});

export function ThreadMapLoader(props: { stops: ThreadMapStop[]; currentId: number; backHref: string }) {
  return <ThreadMap {...props} />;
}
