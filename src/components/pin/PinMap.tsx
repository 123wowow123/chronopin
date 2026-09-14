'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

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
export default function PinMap({ latitude, longitude, title }: { latitude: number; longitude: number; title: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { center: [latitude, longitude], zoom: 11, scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    L.marker([latitude, longitude], { icon }).addTo(map).bindPopup(title);
    return () => {
      map.remove();
    };
  }, [latitude, longitude, title]);

  return <div ref={ref} className="h-[450px] w-full bg-raised" role="img" aria-label={`Map of ${title}`} />;
}
