'use client';

import dynamic from 'next/dynamic';
import type { PinFlightPathJson } from '@/lib/types';
import type { PinSiteShapeJson } from '@/lib/siteShape';
import type { ThreadMapStop } from './ThreadMap';

// Leaflet touches window at import, so the map loads in the browser only.
const PinMap = dynamic(() => import('./PinMap'), {
  ssr: false,
  loading: () => <div className="h-[450px] w-full animate-pulse bg-raised" />,
});

export function PinMapLoader(props: { latitude: number; longitude: number; title: string; flightPath?: PinFlightPathJson; siteShape?: PinSiteShapeJson }) {
  return <PinMap {...props} />;
}

const ThreadMap = dynamic(() => import('./ThreadMap'), {
  ssr: false,
  loading: () => <div className="mt-4 h-[300px] w-full animate-pulse rounded-xl bg-raised" />,
});

export function ThreadMapLoader(props: { stops: ThreadMapStop[]; currentId: number; backHref: string }) {
  return <ThreadMap {...props} />;
}
