'use client';

import dynamic from 'next/dynamic';
import type { PersonDistrictJson } from '@/lib/personDistrict';

// Leaflet touches window at import, so the map loads in the browser only.
const DistrictMap = dynamic(() => import('./DistrictMap'), { ssr: false, loading: () => <div className="h-[320px] w-full animate-pulse rounded-xl bg-raised sm:h-[380px]" /> });

export function DistrictMapLoader({ district }: { district: PersonDistrictJson }) {
  return <DistrictMap district={district} />;
}
