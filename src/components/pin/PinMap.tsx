'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/client/i18n';
import type { PinFlightPathJson } from '@/lib/types';
import { DistrictRedrawControls } from './DistrictRedrawControls';
import { SITE_KINDS, SITE_STYLE, alongLine, districtLayers, mapFeaturesNear, type DistrictView, type PinSiteShapeJson } from '@/lib/siteShape';

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
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';
export const MAP_ATTRIBUTION_PREFIX = '<a href="https://leafletjs.com/" target="_blank" rel="noopener noreferrer" title="A JavaScript library for interactive maps">Leaflet</a>';
export { icon as markerIcon };

// A pin's place on an OpenStreetMap map.
export default function PinMap({
  latitude,
  longitude,
  title,
  flightPath,
  siteShape,
}: {
  latitude: number;
  longitude: number;
  title: string;
  flightPath?: PinFlightPathJson;
  siteShape?: PinSiteShapeJson;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [redrawId, setRedrawId] = useState('');
  const [districtView, setDistrictView] = useState<DistrictView>('compare');
  const redraws = siteShape?.geojson.districtRedraws;
  const redraw = redraws?.find((r) => r.id === redrawId) ?? null;
  // The map is made once; the outline (which may arrive after it) is drawn onto it.
  const [map, setMap] = useState<L.Map | null>(null);
  const framed = useRef<string | null>(null);
  const [armed, setArmed] = useState(false);
  const t = useT();
  const [startLabel, finishLabel, loopLabel] = [t('pin.routeStart'), t('pin.routeFinish'), t('pin.routeStartFinish')];

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { center: [latitude, longitude], zoom: 11, scrollWheelZoom: false });
    map.attributionControl.setPrefix(MAP_ATTRIBUTION_PREFIX);
    // The map sits mid-page, so the wheel only zooms once the map is
    // deliberately in use: a click or a tab onto it arms the wheel, and
    // leaving or blurring the map hands the wheel back to the page.
    // The border warms to the accent while armed, so it is visible that the
    // wheel now belongs to the map rather than to the page.
    const arm = () => {
      map.scrollWheelZoom.enable();
      setArmed(true);
    };
    const disarm = () => {
      map.scrollWheelZoom.disable();
      setArmed(false);
    };
    map.on('click focus', arm);
    map.on('blur', disarm);
    map.getContainer().addEventListener('mouseleave', disarm);
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
    setMap(map);
    return () => {
      map.getContainer().removeEventListener('mouseleave', disarm);
      framed.current = null;
      setMap(null);
      map.remove();
    };
  }, [latitude, longitude, title, flightPath]);

  useEffect(() => {
    if (!map || !siteShape?.geojson.features.length) return;
    // Traced outlines: boundaries under, their parts over
    // (SITE_KINDS is in drawing order), the map framed on the whole site.
    const site = L.featureGroup().addTo(map);
    for (const layer of districtLayers(siteShape, redraw, districtView)) {
      for (const kind of SITE_KINDS) {
        const style = SITE_STYLE[kind];
        const features = layer.features.filter((f) => f.properties.kind === kind);
        if (!features.length) continue;
        L.geoJSON({ type: 'FeatureCollection', features: mapFeaturesNear(features, longitude) } as never, {
          style: () => ({ color: layer.version === 'before' ? '#b45309' : style.color, weight: kind === 'site' || kind === 'wildfire' || kind === 'district' ? 2 : kind === 'route' || kind === 'pipeline' || kind === 'powerline' ? 3 : 1.5, opacity: 0.95, fillColor: style.color, fillOpacity: layer.version === 'before' ? 0 : style.fill, dashArray: layer.version === 'before' ? '7 4' : layer.version === 'after' ? undefined : style.dash }),
          interactive: false,
        }).addTo(site);
      }
    }
    // A course (a single line) gets its start and finish, and a number every
    // 5 km when it is a long one, a marathon but not a circuit.
    const course = siteShape.geojson.features.find((f) => f.properties.kind === 'route' && f.geometry.type === 'LineString');
    if (course) {
      const line = course.geometry.coordinates as [number, number][];
      const dot = (color: string, text: string, size: number) =>
        L.divIcon({
          className: '',
          iconSize: [size, size],
          html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:#fff;border:2px solid #fff;font:700 ${size > 16 ? 10 : 9}px system-ui">${text}</span>`,
        });
      const { marks, totalKm } = alongLine(line, 5);
      const first = line[0];
      const last = line[line.length - 1];
      const loop = Math.hypot(first[0] - last[0], first[1] - last[1]) < 0.003;
      L.marker([first[1], first[0]], { icon: dot('#16a34a', '', 16), interactive: false, keyboard: false }).addTo(site).bindTooltip(loop ? loopLabel : startLabel, { direction: 'top' });
      if (!loop) L.marker([last[1], last[0]], { icon: dot('#111827', '', 16), interactive: false, keyboard: false }).addTo(site).bindTooltip(finishLabel, { direction: 'top' });
      if (totalKm >= 15) {
        for (const m of marks) {
          if (m.km >= totalKm - 1) continue;
          L.marker([m.lat, m.lon], { icon: dot('#e11d48', String(m.km), 20), interactive: false, keyboard: false }).addTo(site);
        }
      }
    }
    // Use the union of both plans so switching sides does not change the framing.
    const bounds = redraw ? L.geoJSON({ type: 'FeatureCollection', features: mapFeaturesNear([...redraw.before.features, ...redraw.after.features], longitude) } as never).getBounds() : site.getBounds();
    // Frame once per outline and chosen plan: flipping before/after keeps the viewer's view.
    const frame = `${redraw?.id ?? ''}`;
    if (bounds.isValid() && framed.current !== frame) {
      framed.current = frame;
      map.fitBounds(redraw ? bounds : bounds.extend([latitude, longitude]), { padding: [24, 24], maxZoom: 17 });
    }
    return () => {
      site.remove();
    };
  }, [map, siteShape, redraw, districtView, longitude, latitude, startLabel, finishLabel, loopLabel]);

  // isolate: Leaflet's panes and controls use z-index 400-1000, which would
  // otherwise scroll over the sticky navbar.
  // The label goes on a wrapper: Leaflet makes its own container focusable and
  // puts the zoom buttons inside it, so role="img" there would announce an
  // image with focusable children.
  return (
    <div className="space-y-2">
      {redraws?.length ? <DistrictRedrawControls redraws={redraws} selected={redraw?.id ?? ''} view={districtView} onSelect={setRedrawId} onView={setDistrictView} /> : null}
    <div
      role="group"
      aria-label={t('pin.mapOf', { title })}
      className={`isolate h-[360px] w-full overflow-hidden rounded-xl border bg-raised ring-2 transition sm:h-[420px] ${
        armed
          ? 'border-accent ring-accent/45 shadow-lg shadow-accent/20'
          : 'border-line ring-transparent'
      }`}
    >
      <div ref={ref} className="size-full" />
    </div>
    </div>
  );
}
