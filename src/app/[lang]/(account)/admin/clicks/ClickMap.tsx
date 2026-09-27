'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { TILE_ATTRIBUTION, TILE_URL } from '@/components/pin/PinMap';
import { SERIES_BLUE } from '../chartParts';

export type ClickPlace = { key: string; label: string; latitude: number; longitude: number; clicks: number };

// Where buy clicks came from: a circle per place, its area by the clicks.
export default function ClickMap({ places }: { places: ClickPlace[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { center: [25, 0], zoom: 1, scrollWheelZoom: false, worldCopyJump: true });
    L.tileLayer(TILE_URL, { maxZoom: 12, attribution: `${TILE_ATTRIBUTION} · <a href="https://db-ip.com">IP Geolocation by DB-IP</a>` }).addTo(map);
    const most = Math.max(1, ...places.map((p) => p.clicks));
    const circles = places.map((p) =>
      L.circleMarker([p.latitude, p.longitude], {
        radius: 4 + 14 * Math.sqrt(p.clicks / most),
        color: SERIES_BLUE,
        weight: 1,
        fillColor: SERIES_BLUE,
        fillOpacity: 0.45,
      })
        .bindTooltip(`${p.label}: ${p.clicks} click${p.clicks === 1 ? '' : 's'}`)
        .addTo(map),
    );
    if (circles.length) map.fitBounds(L.featureGroup(circles).getBounds().pad(0.3), { maxZoom: 6 });
    return () => {
      map.remove();
    };
  }, [places]);
  return <div ref={ref} className="h-72 w-full overflow-hidden rounded-lg border border-line" />;
}
