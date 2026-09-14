'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { TILE_ATTRIBUTION, TILE_URL } from '@/components/pin/PinMap';
import { TimeRangeSlider } from '@/components/timeline/TimeRangeSlider';
import { parseLinkHeader } from '@/lib/client/api';
import { formatSpan, offsetDate } from '@/lib/postedSpan';
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
    popupAnchor: [0, -32],
  });
}

function localStart(pin: PinJson) {
  const d = new Date(pin.utcStartDateTime);
  return pin.allDay ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Every pin with a location between the past and future windows around now.
export default function PinsMap() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [past, setPast] = useState<string | null>(DEFAULT_SPAN);
  const [future, setFuture] = useState<string | null>(DEFAULT_SPAN);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const map = L.map(canvasRef.current!, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const layer = layerRef.current;
    if (!layer) return;
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
        L.marker([pin.latitude, pin.longitude], { icon: pinIcon(localStart(pin) <= now), title: pin.title })
          .bindPopup(
            `<a href="${pinPath(pin)}" style="font-weight:600">${escapeHtml(pin.title)}</a>${pin.address ? `<br>${escapeHtml(pin.address)}` : ''}`,
          )
          .addTo(layer);
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
        const { page, links } = await fetchPage('');
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
  }, [past, future]);

  const phrase = (span: string | null) => (formatSpan(span) || '').replace(/^1 /, '');
  const hasPast = !!past && past !== '0d';
  const hasFuture = !!future && future !== '0d';

  return (
    <div className="relative h-[calc(100dvh-52px)]">
      <div ref={canvasRef} className="absolute inset-0 z-0" />
      <div className="absolute top-3 right-3 z-[1000]">
        <TimeRangeSlider
          steps={MAP_SPAN_OPTIONS}
          past={past}
          future={future}
          onChange={(value) => {
            setPast(value.past);
            setFuture(value.future);
          }}
        />
      </div>
      {status === 'loading' ? (
        <p role="status" className="floating absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full px-4 py-2 text-sm text-ink">Loading pins…</p>
      ) : count === 0 ? (
        <p className="floating absolute bottom-8 left-1/2 z-[1000] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm text-ink">
          No pins with a location{hasPast ? ` in the last ${phrase(past)}` : ''}
          {hasPast && hasFuture ? ' or' : ''}
          {hasFuture ? ` in the next ${phrase(future)}` : ''}.
        </p>
      ) : null}
    </div>
  );
}
