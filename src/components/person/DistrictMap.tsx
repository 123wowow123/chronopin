'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/client/i18n';
import type { PersonDistrictJson } from '@/lib/personDistrict';
import { MAP_ATTRIBUTION_PREFIX, TILE_ATTRIBUTION, TILE_URL } from '@/components/pin/PinMap';

// A member's House district or Senate state, outlined on OpenStreetMap tiles.
export default function DistrictMap({ district }: { district: PersonDistrictJson }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false });
    map.attributionControl.setPrefix(MAP_ATTRIBUTION_PREFIX);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    const outline = L.geoJSON(district.geojson as never, { style: { color: '#0d9488', weight: 2, fillColor: '#0d9488', fillOpacity: 0.18 }, interactive: false }).addTo(map);
    map.fitBounds(outline.getBounds(), { padding: [16, 16] });
    // The wheel zooms the map only once it is clicked or focused, so it never traps page scroll.
    map.on('click focus', () => map.scrollWheelZoom.enable());
    map.getContainer().addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
    return () => {
      map.remove();
    };
  }, [district]);
  return (
    <div role="group" aria-label={t('person.district.mapOf', { label: district.label })} className="isolate h-[320px] w-full overflow-hidden rounded-xl border border-line bg-raised sm:h-[380px]">
      <div ref={ref} className="size-full" />
    </div>
  );
}
