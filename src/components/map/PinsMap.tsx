'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { TILE_ATTRIBUTION, TILE_URL } from '@/components/pin/PinMap';
import { TimeRangeSlider } from '@/components/timeline/TimeRangeSlider';
import { parseLinkHeader } from '@/lib/client/api';
import { SPAN_OPTIONS, formatSpan, offsetDate } from '@/lib/postedSpan';
import { pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';

// Center of the contiguous US, so an empty or loading map has a sensible view.
const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
// A year either side of now: every pin ever posted on one map does not scale.
const DEFAULT_SPAN = '1y';
// A place stays relevant for longer than a posting window, so wider spans than
// the timeline's. '0d' is "nothing on that side".
const MAP_SPAN_OPTIONS = ['0d', '1d', '1w', '1mo', '1y', '3y', '5y'];

const PIN_SVG =
  '<svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" width="24" height="36"><path fill="currentColor" stroke="rgba(0,0,0,.35)" d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>';

function pinIcon(isPast: boolean) {
  return L.divIcon({
    className: isPast ? 'text-past' : 'text-future',
    html: PIN_SVG,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
  });
}

function localStart(pin: PinJson) {
  const d = new Date(pin.utcStartDateTime);
  return pin.allDay ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Every pin with a location between the past and future windows around now,
// optionally narrowed to those posted recently (as the timeline's filter).
export default function PinsMap() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [past, setPast] = useState<string | null>(DEFAULT_SPAN);
  const [future, setFuture] = useState<string | null>(DEFAULT_SPAN);
  const [postedWithin, setPostedWithin] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const map = L.map(canvasRef.current!, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    map.closePopup();
    layer.clearLayers();
    setStatus('loading');
    setCount(0);

    const now = new Date();
    const pastBoundary = past ? offsetDate(now, past, -1) : null;
    const futureBoundary = future ? offsetDate(now, future, 1) : null;
    const seen = new Set<number>();

    const plot = (pins: PinJson[]) => {
      for (const pin of pins) {
        if (seen.has(pin.id) || pin.latitude == null || pin.longitude == null) continue;
        const start = new Date(pin.utcStartDateTime);
        if ((pastBoundary && start < pastBoundary) || (futureBoundary && start > futureBoundary)) continue;
        seen.add(pin.id);
        const marker = L.marker([pin.latitude, pin.longitude], { icon: pinIcon(localStart(pin) <= now), title: pin.title });
        // Opens on hover, and stays open while the pointer moves from the marker
        // onto the popup so its link can be clicked. Not bindPopup: its click
        // handler toggles, which would close a hover-opened popup (and a tap's
        // emulated mouseover). No autoPan: panning under the pointer ends the hover.
        // A standalone popup ignores the icon's popupAnchor: offset is Leaflet's
        // default [0, 7] plus the 32px up to the pin's head.
        const popup = L.popup({ autoPan: false, closeButton: false, offset: [0, -25] })
          .setLatLng(marker.getLatLng())
          .setContent(
            `<a href="${pinPath(pin)}" style="font-weight:600">${escapeHtml(pin.title)}</a>${pin.address ? `<br>${escapeHtml(pin.address)}` : ''}`,
          );
        let closeTimer: ReturnType<typeof setTimeout> | undefined;
        const open = () => {
          clearTimeout(closeTimer);
          map.openPopup(popup);
          const el = popup.getElement()!;
          el.onmouseenter = () => clearTimeout(closeTimer);
          el.onmouseleave = closeSoon;
        };
        const closeSoon = () => {
          clearTimeout(closeTimer);
          closeTimer = setTimeout(() => {
            if (!cancelled) map.closePopup(popup);
          }, 200);
        };
        marker.on({ mouseover: open, mouseout: closeSoon, click: open }).addTo(layer);
      }
      setCount(seen.size);
    };

    const fetchPage = async (query: string) => {
      const res = await fetch(`/api/main${query}`);
      return { page: (await res.json()) as { pins: PinJson[] }, links: parseLinkHeader(res.headers.get('link')) };
    };

    // The first page straddles now; walk outward from it in both directions
    // until each side's boundary is passed (or the pages run out).
    const walk = async (direction: 'next' | 'previous', start: string | undefined, boundary: Date | null) => {
      let query = start;
      while (query && !cancelled) {
        const { page, links } = await fetchPage(query);
        if (cancelled || !page.pins.length) return;
        plot(page.pins);
        const dates = page.pins.map((p) => new Date(p.utcStartDateTime).getTime());
        const extreme = direction === 'next' ? Math.max(...dates) : Math.min(...dates);
        if (boundary && (direction === 'next' ? extreme >= boundary.getTime() : extreme <= boundary.getTime())) return;
        query = links[direction];
      }
    };

    (async () => {
      try {
        // Later pages' links carry the resolved cutoff, so only the first names the span.
        const { page, links } = await fetchPage(postedWithin ? `?created_within=${encodeURIComponent(postedWithin)}` : '');
        if (cancelled) return;
        plot(page.pins);
        await Promise.all([walk('next', links.next, futureBoundary), walk('previous', links.previous, pastBoundary)]);
      } finally {
        if (!cancelled) setStatus('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [past, future, postedWithin]);

  const phrase = (span: string | null) => (formatSpan(span) || '').replace(/^1 /, '');
  const hasPast = !!past && past !== '0d';
  const hasFuture = !!future && future !== '0d';

  return (
    // isolate: the controls need z-[1000] to sit over Leaflet's panes, but that
    // must stay inside the map, under the navbar's menus and panels.
    <div className="relative isolate h-[calc(100dvh-52px)]">
      <div ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <TimeRangeSlider
          steps={MAP_SPAN_OPTIONS}
          past={past}
          future={future}
          onChange={(value) => {
            setPast(value.past);
            setFuture(value.future);
          }}
        />
        <TimeRangeSlider steps={SPAN_OPTIONS} past={postedWithin} pastOnly onChange={(value) => setPostedWithin(value.past)} />
      </div>
      {status === 'loading' ? (
        <p role="status" className="floating absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full px-4 py-2 text-sm text-ink">Loading pins…</p>
      ) : count === 0 ? (
        <p className="floating absolute bottom-8 left-1/2 z-[1000] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm text-ink">
          No pins with a location{hasPast ? ` in the last ${phrase(past)}` : ''}
          {hasPast && hasFuture ? ' or' : ''}
          {hasFuture ? ` in the next ${phrase(future)}` : ''}
          {postedWithin ? `, posted in the last ${phrase(postedWithin)}` : ''}.
        </p>
      ) : null}
    </div>
  );
}
