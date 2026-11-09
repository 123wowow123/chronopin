'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { MAP_ATTRIBUTION_PREFIX, TILE_ATTRIBUTION, TILE_URL } from '@/components/pin/PinMap';
import { acreFeet, usdShort, type DamRow, type StateAgg } from '@/lib/damSpecs';

type Metric = 'count' | 'cost' | 'storage' | 'mw';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'count', label: 'Projects' }, { key: 'cost', label: 'Cost (USD)' }, { key: 'storage', label: 'Storage' }, { key: 'mw', label: 'Capacity (MW)' },
];
const value = (s: StateAgg, m: Metric) => (m === 'count' ? s.count : m === 'cost' ? s.costUsd : m === 'storage' ? s.storageAcreFt + s.addedStorageAcreFt : s.capacityMw);
const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// One bubble per state, area proportional to the chosen total, plus a dot per dam.
export default function DamsMap({ byState, dams }: { byState: StateAgg[]; dams: DamRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<Metric>('cost');
  const [map, setMap] = useState<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const m = L.map(ref.current, { center: [39.5, -98.5], zoom: 4, scrollWheelZoom: false, minZoom: 3 });
    m.attributionControl.setPrefix(MAP_ATTRIBUTION_PREFIX);
    m.on('click focus', () => m.scrollWheelZoom.enable());
    m.getContainer().addEventListener('mouseleave', () => m.scrollWheelZoom.disable());
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    setMap(m);
    return () => { m.remove(); layer.current = null; };
  }, []);

  useEffect(() => {
    if (!map || !layer.current) return;
    layer.current.clearLayers();
    const max = Math.max(1, ...byState.map((s) => value(s, metric)));
    const bounds: L.LatLngTuple[] = [];
    for (const s of byState) {
      const v = value(s, metric);
      const radius = v > 0 ? 10 + 34 * Math.sqrt(v / max) : 7;
      const lines = [`<strong>${esc(s.state)}</strong> · ${s.count} project${s.count === 1 ? '' : 's'}`];
      if (s.costUsd > 0) lines.push(`Cost ${usdShort(s.costUsd)}`);
      if (s.storageAcreFt + s.addedStorageAcreFt > 0) lines.push(`Storage ${acreFeet(s.storageAcreFt + s.addedStorageAcreFt)}`);
      if (s.capacityMw > 0) lines.push(`${Math.round(s.capacityMw).toLocaleString('en-US')} MW`);
      L.circleMarker([s.lat, s.lon], { radius, color: '#0369a1', weight: 2, fillColor: '#0ea5e9', fillOpacity: v > 0 ? 0.35 : 0.12 })
        .bindPopup(lines.join('<br>')).bindTooltip(`${s.state}: ${metric === 'count' ? s.count : metric === 'cost' ? usdShort(v) : metric === 'storage' ? acreFeet(v) : `${Math.round(v).toLocaleString('en-US')} MW`}`, { direction: 'top' })
        .addTo(layer.current);
      bounds.push([s.lat, s.lon]);
    }
    for (const d of dams) {
      if (d.lat == null || d.lon == null) continue;
      L.circleMarker([d.lat, d.lon], { radius: 4, color: '#be123c', weight: 1, fillColor: '#e11d48', fillOpacity: 0.9 })
        .bindPopup(`<a href="${esc(d.href)}">${esc(d.title)}</a>${d.status ? `<br>${esc(d.status)}` : ''}`).addTo(layer.current);
      bounds.push([d.lat, d.lon]);
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [map, byState, dams, metric]);

  return (
    <div>
      <div role="group" aria-label="Map metric" className="mb-2 flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button key={m.key} type="button" aria-pressed={metric === m.key} onClick={() => setMetric(m.key)}
            className={`rounded-full border border-line px-3 py-1 text-sm hover:bg-panel ${metric === m.key ? 'bg-panel font-medium' : ''}`}>{m.label}</button>
        ))}
      </div>
      <div ref={ref} className="h-[26rem] w-full overflow-hidden rounded-xl border border-line" data-dams-map />
      <p className="mt-1 text-xs text-muted">Blue bubbles: one per state, area follows the chosen total. Red dots: individual dam projects.</p>
    </div>
  );
}
