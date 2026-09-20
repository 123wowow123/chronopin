'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/client/i18n';
import type { PinFlightPathJson } from '@/lib/types';

// Leaflet's default marker images are resolved relative to its CSS, which a
// bundler breaks; point them at the CDN copies instead.
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export { icon as markerIcon };

// A pin's place on an OpenStreetMap map.
export default function PinMap({
  latitude,
  longitude,
  title,
  flightPath,
}: {
  latitude: number;
  longitude: number;
  title: string;
  flightPath?: PinFlightPathJson;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { center: [latitude, longitude], zoom: 11, scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    L.marker([latitude, longitude], { icon }).addTo(map).bindPopup(title);
    // The path leaves the pin's place (the marker); a dashed line marks a
    // computed estimate as opposed to a simulated trajectory.
    if (flightPath) {
      const line = L.polyline(flightPath.points, {
        color: '#e11d48',
        weight: 3,
        opacity: 0.85,
        dashArray: flightPath.estimated ? '8 6' : undefined,
      }).addTo(map);
      map.fitBounds(line.getBounds().extend([latitude, longitude]), { padding: [24, 24], maxZoom: 6 });
    }
    return () => {
      map.remove();
    };
  }, [latitude, longitude, title, flightPath]);

  // isolate: Leaflet's panes and controls use z-index 400-1000, which would
  // otherwise scroll over the sticky navbar.
  // The label goes on a wrapper: Leaflet makes its own container focusable and
  // puts the zoom buttons inside it, so role="img" there would announce an
  // image with focusable children.
  return (
    <div
      role="group"
      aria-label={t('pin.mapOf', { title })}
      className="isolate h-[360px] w-full overflow-hidden rounded-xl border border-line bg-raised sm:h-[420px]"
    >
      <div ref={ref} className="size-full" />
    </div>
  );
}
