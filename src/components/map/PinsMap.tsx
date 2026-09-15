'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { TILE_ATTRIBUTION, TILE_URL } from '@/components/pin/PinMap';
import { CategoryFilter } from '@/components/timeline/CategoryFilter';
import { TimeRangeSlider } from '@/components/timeline/TimeRangeSlider';
import { Icon } from '@/components/ui/Icon';
import { blobUrl } from '@/lib/appConfig';
import { canonicalCategory } from '@/lib/categories';
import { parseLinkHeader } from '@/lib/client/api';
import { DEFAULT_POSTED_WITHIN, SPAN_OPTIONS, formatSpan, offsetDate } from '@/lib/postedSpan';
import { removeTerm, toggleTerm } from '@/lib/searchTerms';
import { pinPath } from '@/lib/seo';
import type { PinJson } from '@/lib/types';
import { joinSearchQuery, parseSearchQuery, splitSearchQuery } from '@/server/util/searchQuery';

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

// No picks shows every pin; several show pins in any of them.
const inCategories = (category: string, picks: string[]) => !picks.length || picks.includes(category.toLowerCase());

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const POPUP_WIDTH = 200;

// A pin's popup: its picture (an image's thumb or a video's still) edge to
// edge over its title and address. Its content is built on open, so the map
// does not fetch every pin's picture up front. A standalone popup ignores the
// icon's popupAnchor: offset is Leaflet's default [0, 7] plus the 32px up to
// the pin's head.
function pinPopup(pin: PinJson, options: L.PopupOptions = {}) {
  return L.popup({
    autoPan: false,
    closeButton: false,
    offset: [0, -25],
    className: 'pin-popup',
    minWidth: POPUP_WIDTH,
    maxWidth: POPUP_WIDTH,
    ...options,
  })
    .setLatLng([pin.latitude!, pin.longitude!])
    .setContent(() => popupContent(pin));
}

// A thumb that fails to load (a local production build points at deleted
// blobs) falls back to an image's original, then goes.
function popupContent(pin: PinJson) {
  const content = document.createElement('div');
  content.innerHTML =
    `<div class="px-2.5 pt-1.5 pb-2"><a href="${pinPath(pin)}" class="line-clamp-2 font-semibold">${escapeHtml(pin.title)}</a>` +
    `${pin.address ? `<div class="truncate text-subtle">${escapeHtml(pin.address)}</div>` : ''}</div>`;
  const medium = pin.media?.[0];
  const original = medium && String(medium.type) === '1' ? medium.originalUrl : undefined;
  const sources = [blobUrl(medium?.thumbName), original].filter((src): src is string => !!src);
  if (!sources.length) return content;

  const link = document.createElement('a');
  link.href = pinPath(pin);
  link.className = 'block';
  const img = document.createElement('img');
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.className = 'block aspect-video w-full object-cover';
  img.onerror = () => {
    sources.shift();
    if (sources.length) img.src = sources[0];
    else link.remove();
  };
  img.src = sources[0];
  link.append(img);
  content.prepend(link);
  return content;
}

// Whether this document was loaded on the map, rather than reaching it by a
// client-side navigation from another page of the app.
function loadedAsMap() {
  const entry = performance.getEntriesByType('navigation')[0];
  return !entry || new URL(entry.name).pathname.startsWith('/map');
}

// Every pin with a location between the past and future windows around now,
// optionally narrowed to those posted recently (as the timeline's filter).
// The navbar search works here as on the timeline: /map?q=...&f=watch shows
// the search's pins, and category picks are category: terms in that query.
// /map?pin=<id> (a pin page's "Show on map") centers on that pin, shows it
// whatever the filters, and keeps its popup open until the map is clicked.
export default function PinsMap() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get('q') || '';
  const focusId = Number(params.get('pin')) || undefined;
  const watched = params.get('f')?.toLowerCase() === 'watch';
  const categories = [...new Set(parseSearchQuery(query).categories.map(canonicalCategory))];
  const categoryKey = categories.map((c) => c.toLowerCase()).join('|');
  // The query less its category terms decides which pins to fetch; categories
  // only show and hide markers, so picking one needs no refetch.
  const fetchQuery = joinSearchQuery(splitSearchQuery(query).filter((part) => !(part.kind === 'term' && part.field === 'category')));
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Every marker in the time window with its pin's category; the category
  // filter only shows and hides these, so a pick needs no refetch.
  const markersRef = useRef<{ marker: L.Marker; category: string; focus: boolean }[]>([]);
  const categoriesRef = useRef<string[]>([]);
  // The popup open until a click elsewhere (a clicked or the focused pin's),
  // and which pin was last centered on: a refetch (a slider moved) re-adds the
  // marker but neither recenters nor reopens a popup the viewer already closed.
  const stickyRef = useRef<{ popup: L.Popup; pinId: number } | null>(null);
  const focusedRef = useRef<number | undefined>(undefined);
  // The focused pin, once plotted, for the back button's link.
  const [focusPin, setFocusPin] = useState<PinJson | null>(null);
  const [past, setPast] = useState<string | null>(DEFAULT_SPAN);
  const [future, setFuture] = useState<string | null>(DEFAULT_SPAN);
  const [postedWithin, setPostedWithin] = useState<string | null>(DEFAULT_POSTED_WITHIN);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [count, setCount] = useState(0);
  // Markers per category in the time window, for the category pills.
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number> | null>(null);

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
    markersRef.current = [];
    setStatus('loading');
    setCount(0);
    setCategoryCounts(null);

    const now = new Date();
    const pastBoundary = past ? offsetDate(now, past, -1) : null;
    const futureBoundary = future ? offsetDate(now, future, 1) : null;
    const seen = new Set<number>();

    // Opens a pin's popup to stay, replacing the last one that did: a marker
    // clicked, or the focused pin. autoClose off: hovering other pins opens
    // their popups beside it. The map's closePopupOnClick still closes it on a
    // click elsewhere (a marker's click does not reach the map).
    const stick = (pin: PinJson) => {
      if (stickyRef.current?.pinId === pin.id && map.hasLayer(stickyRef.current.popup)) return;
      const sticky = pinPopup(pin, { autoClose: false });
      sticky.on('remove', () => {
        if (stickyRef.current?.popup === sticky) stickyRef.current = null;
      });
      stickyRef.current?.popup.close();
      stickyRef.current = { popup: sticky, pinId: pin.id };
      sticky.openOn(map);
    };

    const plot = (pins: PinJson[]) => {
      for (const pin of pins) {
        if (seen.has(pin.id) || pin.latitude == null || pin.longitude == null) continue;
        const focus = pin.id === focusId;
        const start = new Date(pin.utcStartDateTime);
        if (!focus && ((pastBoundary && start < pastBoundary) || (futureBoundary && start > futureBoundary))) continue;
        seen.add(pin.id);
        const marker = L.marker([pin.latitude, pin.longitude], { icon: pinIcon(localStart(pin) <= now), title: pin.title });
        // Opens on hover, and stays open while the pointer moves from the marker
        // onto the popup so its link can be clicked. Not bindPopup: its click
        // handler toggles, which would close a hover-opened popup (and a tap's
        // emulated mouseover). No autoPan: panning under the pointer ends the hover.
        const popup = pinPopup(pin);
        let closeTimer: ReturnType<typeof setTimeout> | undefined;
        const open = () => {
          clearTimeout(closeTimer);
          // Already showing, and staying until a click elsewhere.
          if (stickyRef.current?.pinId === pin.id && map.hasLayer(stickyRef.current.popup)) return;
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
        const click = () => {
          clearTimeout(closeTimer);
          stick(pin);
        };
        marker.on({ mouseover: open, mouseout: closeSoon, click });
        const category = (pin.category || '').toLowerCase();
        markersRef.current.push({ marker, category, focus });
        if (focus || inCategories(category, categoriesRef.current)) marker.addTo(layer);
        if (focus && focusedRef.current !== pin.id) {
          focusedRef.current = pin.id;
          setFocusPin(pin);
          map.setView(marker.getLatLng(), Math.max(map.getZoom(), 11));
          stick(pin);
        }
      }
      setCount(layer.getLayers().length);
      const counts: Record<string, number> = {};
      for (const { category } of markersRef.current) counts[category] = (counts[category] || 0) + 1;
      setCategoryCounts(counts);
    };

    // Links do not carry the watch choice, so every page asks for it.
    const fetchPage = async (cursor: string) => {
      const res = await fetch(`/api/main${cursor}${watched ? `${cursor ? '&' : '?'}hasFavorite=1` : ''}`);
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

    // A search answers with all its pins at once; the posted-within cutoff
    // and the time windows (in plot) narrow them here.
    const search = async () => {
      const searchParams = new URLSearchParams({ q: fetchQuery });
      if (watched) searchParams.set('f', 'watch');
      const res = await fetch(`/api/pins/search?${searchParams.toString()}`);
      if (!res.ok) throw new Error(res.statusText);
      const { pins } = (await res.json()) as { pins: PinJson[] };
      const cutoff = postedWithin ? offsetDate(now, postedWithin, -1) : null;
      if (!cancelled) plot(cutoff ? pins.filter((pin) => !pin.utcCreatedDateTime || new Date(pin.utcCreatedDateTime) >= cutoff) : pins);
    };

    // The focused pin may fall outside the search or time window, so it is
    // fetched on its own; whichever answer plots it first wins.
    if (focusId) {
      fetch(`/api/pins/${focusId}`)
        .then((res) => (res.ok ? (res.json() as Promise<PinJson>) : null))
        .then((pin) => {
          if (pin && !cancelled) plot([pin]);
        })
        .catch(() => {});
    }

    (async () => {
      try {
        if (fetchQuery) {
          await search();
        } else {
          // Later pages' links carry the resolved cutoff, so only the first names the span.
          const { page, links } = await fetchPage(postedWithin ? `?created_within=${encodeURIComponent(postedWithin)}` : '');
          if (cancelled) return;
          plot(page.pins);
          await Promise.all([walk('next', links.next, futureBoundary), walk('previous', links.previous, pastBoundary)]);
        }
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [past, future, postedWithin, fetchQuery, watched, focusId]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    const picks = categoryKey ? categoryKey.split('|') : [];
    categoriesRef.current = picks;
    if (!map || !layer) return;
    map.closePopup();
    for (const { marker, category, focus } of markersRef.current) {
      if (focus || inCategories(category, picks)) layer.addLayer(marker);
      else layer.removeLayer(marker);
    }
    setCount(layer.getLayers().length);
  }, [categoryKey]);

  // Picks edit the query in the URL, so the navbar search box shows them.
  function go(edit: (q: string) => string) {
    const next = new URLSearchParams(params.toString());
    const q = edit(query);
    if (q) next.set('q', q);
    else next.delete('q');
    // Replaced while on a pin, so "Back to pin" is still one step back.
    const href = next.size ? `/map?${next.toString()}` : '/map';
    if (focusId) router.replace(href);
    else router.push(href);
  }

  const phrase = (span: string | null) => (formatSpan(span) || '').replace(/^1 /, '');
  const hasPast = !!past && past !== '0d';
  const hasFuture = !!future && future !== '0d';

  return (
    // isolate: the controls need z-[1000] to sit over Leaflet's panes, but that
    // must stay inside the map, under the navbar's menus and panels.
    <div className="relative isolate h-[calc(100dvh-52px)]">
      {/* With the back button above them, Leaflet's zoom buttons move down a row. */}
      <div ref={canvasRef} className={`absolute inset-0 z-0 ${focusId ? '[&_.leaflet-top.leaflet-left]:pt-10' : ''}`} />
      {focusId ? (
        // Above Leaflet's zoom buttons. Back through history when the map was
        // reached inside the app (the pin page's link), so the pin page is not
        // stacked twice; a real link to the pin when the page was loaded as
        // the map (a shared link, a new tab, a reload), where back leaves.
        <a
          href={focusPin?.id === focusId ? pinPath(focusPin) : `/pin/${focusId}`}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0 || loadedAsMap()) return;
            event.preventDefault();
            router.back();
          }}
          className="floating absolute top-2.5 left-2.5 z-[1000] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink hover:no-underline"
        >
          <Icon name="back" className="size-4" />
          {/* Just the arrow on a phone, where the filters take the rest of the row. */}
          <span className="sr-only sm:not-sr-only">Back to pin</span>
        </a>
      ) : null}
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
        <CategoryFilter
          selected={categories}
          counts={categoryCounts}
          onToggle={(category) => go((q) => toggleTerm(q, 'category', category))}
          onClear={() => go((q) => categories.reduce((rest, category) => removeTerm(rest, 'category', category), q))}
          className="w-64"
        />
      </div>
      {status === 'loading' ? (
        <p role="status" className="floating absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full px-4 py-2 text-sm text-ink">Loading pins…</p>
      ) : status === 'error' ? (
        <p role="alert" className="floating absolute bottom-8 left-1/2 z-[1000] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm text-ink">
          Search is unavailable right now. Please try again in a bit.
        </p>
      ) : count === 0 ? (
        <p className="floating absolute bottom-8 left-1/2 z-[1000] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm text-ink">
          No {watched ? 'watched ' : ''}pins{fetchQuery ? ` matching “${fetchQuery}”` : ''} with a location{hasPast ? ` in the last ${phrase(past)}` : ''}
          {hasPast && hasFuture ? ' or' : ''}
          {hasFuture ? ` in the next ${phrase(future)}` : ''}
          {postedWithin ? `, posted in the last ${phrase(postedWithin)}` : ''}
          {categories.length ? ` in ${categories.join(' or ')}` : ''}.
        </p>
      ) : null}
    </div>
  );
}
