'use client';

import dynamic from 'next/dynamic';
import type { PinFlightPathJson } from '@/lib/types';
import type { PinSiteShapeJson } from '@/lib/siteShape';

// Leaflet touches window at import, so the map loads in the browser only.
const PinMap = dynamic(() => import('./PinMap'), {
  ssr: false,
  loading: () => <div className="h-[450px] w-full animate-pulse bg-raised" />,
});

export function PinMapLoader(props: { latitude: number; longitude: number; title: string; flightPath?: PinFlightPathJson; siteShape?: PinSiteShapeJson }) {
  return <PinMap {...props} />;
}
