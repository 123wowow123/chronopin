'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import Link from '@/components/ui/Link';
import { useT } from '@/lib/client/i18n';
import { MAP_ATTRIBUTION_PREFIX, TILE_ATTRIBUTION, TILE_URL } from './PinMap';

export type ThreadMapStop = { id: number; n: number; title: string; href: string; latitude: number; longitude: number };

// Every located pin of a thread on one map: numbered as in the thread list,
// joined in order, the pin being read highlighted.
export default function ThreadMap({ stops, currentId, backHref }: { stops: ThreadMapStop[]; currentId: number; backHref: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (!ref.current || !stops.length) return;
    const map = L.map(ref.current, { scrollWheelZoom: false });
    map.attributionControl.setPrefix(MAP_ATTRIBUTION_PREFIX);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    const points = stops.map((s) => [s.latitude, s.longitude] as [number, number]);
    L.polyline(points, { color: '#2563eb', weight: 2, opacity: 0.6, dashArray: '4 6' }).addTo(map);
    for (const s of stops) {
      const marker = L.marker([s.latitude, s.longitude], {
        icon: L.divIcon({
          className: '',
          iconSize: [26, 26],
          html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;font:600 12px system-ui;color:#fff;border:2px solid #fff;background:${s.id === currentId ? '#e11d48' : '#2563eb'}">${s.n}</span>`,
        }),
        zIndexOffset: s.id === currentId ? 1000 : 0,
      }).addTo(map);
      const link = document.createElement('a');
      link.href = s.href;
      link.textContent = s.title;
      marker.bindPopup(link);
    }
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 12 });
    return () => {
      map.remove();
    };
  }, [stops, currentId]);

  return (
    <div role="group" aria-label={t('pin.threadMap')} className="isolate relative mt-4 h-[300px] w-full overflow-hidden rounded-xl border border-line bg-raised">
      <div ref={ref} className="size-full" />
      <Link
        href={`/map?q=${encodeURIComponent(`pin:${stops.map((s) => `${s.id}=${s.n}`).join(',')}`)}&fit=results&returnTo=${encodeURIComponent(backHref)}`}
        className="absolute end-2 top-2 z-[1000] rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-medium text-ink shadow hover:bg-raised hover:no-underline"
      >
        {t('pin.threadMapFull')}
      </Link>
    </div>
  );
}
