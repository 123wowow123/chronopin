'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { localizeHere, useRouter, useSearchParams, withPageLang } from '@/lib/client/navigation';
import { useEffect, useRef, useState } from 'react';
import { TILE_ATTRIBUTION, TILE_URL } from '@/components/pin/PinMap';
import { FloatingControls } from '@/components/timeline/FloatingControls';
import { TagCloud, tagPillSummary } from '@/components/timeline/TagCloud';
import { TimeRangeSlider } from '@/components/timeline/TimeRangeSlider';
import { PinWebGraph } from '@/components/map/PinWebGraph';
import { WebLegend } from '@/components/map/WebLegend';
import { Icon } from '@/components/ui/Icon';
import { blobUrl } from '@/lib/appConfig';
import { canonicalCategory, isCategory } from '@/lib/categories';
import { clearSpot, peekMapSpot, setMapViewSource } from '@/lib/client/returnSpot';
import { useQueryState } from '@/lib/client/urlState';
import { viewerPlace } from '@/lib/client/viewerPlace';
import { distanceKm, formatDistance, greatCirclePoints } from '@/lib/distance';
import { usesImperial } from '@/lib/weather';
import { DEFAULT_POSTED_WITHIN, EVENT_SPAN_OPTIONS, SPAN_OPTIONS, eventSpanSummary, offsetDate, spanFromParam, spanLabel, spanPhrase, spanToParam } from '@/lib/postedSpan';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { pinPath } from '@/lib/seo';
import { webColor, webIntensity, webModeFromParam, type WebEdge, type WebKind, type WebMode } from '@/lib/pinWeb';
import type { MapPinJson, PinJson } from '@/lib/types';
import { joinSearchQuery, splitSearchQuery } from '@/server/util/searchQuery';
import { useT } from '@/lib/client/i18n';
import { categoryLabel } from '@/lib/i18n/labels';

// The categories a query picks: its tag: terms (and old category: ones) that
// name one. They are what the markers are shown and hidden by.
function queryCategories(query?: string) {
  return [...new Set(parseSearchQuery(query).tags.filter(isCategory).map(canonicalCategory))];
}

// Center of the contiguous US, so an empty or loading map has a sensible view.
const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
// Opening on the viewer's own place: their region, with the pins around it.
const HOME_ZOOM = 6;
// A year either side of now: every pin ever posted on one map does not scale.
const DEFAULT_SPAN = '1y';

// The line from the viewer to the focused pin (from=me). Rose, as on a pin's
// own map: a line the app drew rather than a relation between two pins.
const FROM_COLOR = '#e11d48';

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

function localStart(pin: MapPinJson) {
  const d = new Date(pin.utcStartDateTime);
  return pin.allDay ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
}

// No picks shows every pin; several show pins in any of them.
const inCategories = (categories: string[], picks: string[]) => !picks.length || categories.some((c) => picks.includes(c));

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const POPUP_WIDTH = 200;
// Wider than a pin's: a web line's popup sets a picture beside each title.
const WEB_POPUP_WIDTH = 260;

// Where the map has room beside the pins for the web's toggle and graph (xl).
const WIDE = '(width >= 80rem)';

// A pin's popup: its picture (an image's thumb or a video's still) edge to
// edge over its title and address. Its content is built on open, so the map
// does not fetch every pin's picture up front. A standalone popup ignores the
// icon's popupAnchor: offset is Leaflet's default [0, 7] plus the 32px up to
// the pin's head.
function pinPopup(pin: MapPinJson, options: L.PopupOptions = {}) {
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

// Opens a pin's popup to stay, replacing the last one that did: a marker
// clicked, a graph node picked, or the focused pin. autoClose off: hovering
// other pins opens their popups beside it. The map's closePopupOnClick still
// closes it on a click elsewhere (a marker's click does not reach the map).
// The graph's picked node follows it: set while it shows, cleared when it goes.
function stickPopup(
  map: L.Map,
  stickyRef: { current: { popup: L.Popup; pinId: number } | null },
  pin: MapPinJson,
  at: L.LatLng,
  pick: (id: number | undefined) => void,
) {
  if (stickyRef.current?.pinId === pin.id && map.hasLayer(stickyRef.current.popup)) return;
  const sticky = pinPopup(pin, { autoClose: false }).setLatLng(at);
  sticky.on('remove', () => {
    if (stickyRef.current?.popup !== sticky) return;
    stickyRef.current = null;
    pick(undefined);
  });
  stickyRef.current?.popup.close();
  stickyRef.current = { popup: sticky, pinId: pin.id };
  pick(pin.id);
  sticky.openOn(map);
}

// A pin's popup picture, best source first: the video's still when there is
// one, as the pin's media frame shows it first, then an image's original for
// a build whose thumbs are gone.
function pictureSources(pin: MapPinJson) {
  const medium = pin.media?.find((m) => String(m.type) === '3') ?? pin.media?.[0];
  const original = medium && String(medium.type) === '1' ? medium.originalUrl : undefined;
  return [blobUrl(medium?.thumbName), original].filter((src): src is string => !!src);
}

// A thumb that fails to load (a local production build points at deleted
// blobs) falls through its sources, then calls gone() with none left.
function pictureImg(sources: string[], className: string, gone: () => void) {
  const img = document.createElement('img');
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.className = className;
  img.onerror = () => {
    sources.shift();
    if (sources.length) img.src = sources[0];
    else gone();
  };
  img.src = sources[0];
  return img;
}

function popupContent(pin: MapPinJson) {
  const content = document.createElement('div');
  content.innerHTML =
    `<div class="px-2.5 pt-1.5 pb-2"><a href="${localizeHere(pinPath(pin))}" class="line-clamp-2 font-semibold">${escapeHtml(pin.title)}</a>` +
    `${pin.address ? `<div class="truncate text-subtle">${escapeHtml(pin.address)}</div>` : ''}</div>`;
  const sources = pictureSources(pin);
  if (!sources.length) return content;

  const link = document.createElement('a');
  link.href = localizeHere(pinPath(pin));
  link.className = 'block';
  link.append(pictureImg(sources, 'block aspect-video w-full object-cover', () => link.remove()));
  content.prepend(link);
  return content;
}

// One end of a web line: its picture beside its title, as a link to the pin.
// The picture keeps its tile when there is none or every source fails, so the
// two rows stay aligned and the connector between them runs straight.
function webPopupRow(pin: MapPinJson) {
  const row = document.createElement('a');
  row.href = localizeHere(pinPath(pin));
  row.className = 'relative -mx-1 flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-raised hover:no-underline';

  const tile = document.createElement('span');
  tile.className = 'block aspect-video w-14 shrink-0 overflow-hidden rounded-md bg-raised ring-1 ring-line';
  const sources = pictureSources(pin);
  if (sources.length) tile.append(pictureImg(sources, 'block h-full w-full object-cover', () => (tile.innerHTML = '')));

  const title = document.createElement('span');
  title.className = 'line-clamp-2 font-medium';
  title.textContent = pin.title;

  row.append(tile, title);
  return row;
}

// A web line's popup: why the two pins are joined — the kind of relation in
// its own colour over the thing they share (the tag, the company, the source),
// and how much else they have in common, since a line is only drawn once a
// pair shares enough — and a row for each end, threaded by a line in the same
// colour so the two read as the ends of one connection. Kinds with nothing
// shared (a thread, a duplicate) put the kind itself in the headline instead.
function webPopupContent(from: MapPinJson, to: MapPinJson, kind: WebKind, kindLabel: string, label?: string, also?: string) {
  const color = webColor(kind);
  const content = document.createElement('div');
  content.className = 'px-3 py-2.5';
  content.innerHTML =
    `<div class="flex items-center gap-1.5">` +
    `<span class="h-1 w-4 shrink-0 rounded-full" style="background-color:${color}"></span>` +
    (label
      ? `<span class="truncate text-[10px] font-semibold tracking-wider uppercase text-muted">${escapeHtml(kindLabel)}</span></div>` +
        `<div class="mt-1 line-clamp-2 text-sm leading-snug font-semibold">${escapeHtml(label)}</div>`
      : `<span class="truncate text-sm leading-snug font-semibold">${escapeHtml(kindLabel)}</span></div>`) +
    (also ? `<div class="mt-0.5 text-xs text-muted">${escapeHtml(also)}</div>` : '');

  const ends = document.createElement('div');
  ends.className = 'relative mt-2 flex flex-col gap-1';
  // Behind the rows: the opaque tiles cover it, leaving it visible in the gap.
  const thread = document.createElement('span');
  thread.className = 'absolute inset-y-3 left-8 w-0.5 -translate-x-1/2 rounded-full opacity-50';
  thread.style.backgroundColor = color;
  ends.append(thread, webPopupRow(from), webPopupRow(to));
  content.append(ends);
  return content;
}

// A plotted pin. Leaflet repeats the world sideways but not its markers, so a
// pin gets a marker (a copy) on each copy of the world in view: offset k sits
// at its longitude + 360k. Copies are made as the view reaches them and taken
// off as they leave it.
type MapEntry = { pin: MapPinJson; categories: string[]; focus: boolean; copies: Map<number, L.Marker>; make: (offset: number) => L.Marker };

// The world copy of a longitude nearest another: where a pin is closest to the view.
const nearestOffset = (lng: number, toLng: number) => Math.round((toLng - lng) / 360);

// Which copies of each shown pin the view (padded, so a pin at the edge does
// not pop in late) holds; a pin with none in view keeps no marker at all.
function syncCopies(map: L.Map, layer: L.LayerGroup, entries: MapEntry[], picks: string[]) {
  const bounds = map.getBounds().pad(0.25);
  const [south, north] = [bounds.getSouth(), bounds.getNorth()];
  const [west, east] = [bounds.getWest(), bounds.getEast()];
  for (const entry of entries) {
    const { latitude: lat, longitude: lng } = entry.pin;
    const wanted = new Set<number>();
    if ((entry.focus || inCategories(entry.categories, picks)) && lat! >= south && lat! <= north) {
      for (let k = Math.ceil((west - lng!) / 360); k <= Math.floor((east - lng!) / 360); k++) wanted.add(k);
    }
    for (const [k, marker] of entry.copies) {
      if (wanted.has(k)) continue;
      layer.removeLayer(marker);
      entry.copies.delete(k);
    }
    for (const k of wanted) {
      if (!entry.copies.has(k)) entry.copies.set(k, entry.make(k).addTo(layer));
    }
  }
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
// the search's pins, and category picks are tag: terms naming a category.
// /map?pin=<id> (a pin page's "To map") centers on that pin, shows it
// whatever the filters, and keeps its popup open until the map is clicked.
// sliderTyping: whether the filter sliders offer a typed box, and tagList
// whether the tag panel lists its tags (the admin settings).
export default function PinsMap({ sliderTyping = false, tagList = false }: { sliderTyping?: boolean; tagList?: boolean }) {
  const router = useRouter();
  const t = useT();
  const params = useSearchParams();
  const query = params.get('q') || '';
  const focusId = Number(params.get('pin')) || undefined;
  // From a pin's distance, clicked: draw what it measured. The viewer's place
  // is the browser's to work out, so the URL only asks for it.
  const fromMe = params.get('from') === 'me';
  const watched = params.get('f')?.toLowerCase() === 'watch';
  const categories = queryCategories(query);
  const categoryKey = categories.map((c) => c.toLowerCase()).join('|');
  // The query less its category terms decides which pins to fetch; categories
  // only show and hide markers, so picking one needs no refetch.
  const isCategoryTerm = (part: ReturnType<typeof splitSearchQuery>[number]) => part.kind === 'term' && (part.field === 'category' || part.field === 'tag') && isCategory(part.value);
  const fetchQuery = joinSearchQuery(splitSearchQuery(query).filter((part) => !isCategoryTerm(part)));
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Every marker in the time window with its pin's category; the category
  // filter only shows and hides these, so a pick needs no refetch.
  const markersRef = useRef<MapEntry[]>([]);
  const categoriesRef = useRef<string[]>([]);
  // The popup open until a click elsewhere (a clicked or the focused pin's),
  // and which pin was last centered on: a refetch (a slider moved) re-adds the
  // marker but neither recenters nor reopens a popup the viewer already closed.
  const stickyRef = useRef<{ popup: L.Popup; pinId: number } | null>(null);
  const focusedRef = useRef<number | undefined>(undefined);
  // Back from logging in on the view the reader left: a focused pin still
  // gets its popup, but no longer moves the map.
  const keepViewRef = useRef(false);
  // The focused pin, once plotted, for the back button's link.
  const [focusPin, setFocusPin] = useState<MapPinJson | null>(null);
  const [past, setPast] = useState(() => spanFromParam(params.get('past'), DEFAULT_SPAN));
  const [future, setFuture] = useState(() => spanFromParam(params.get('future'), DEFAULT_SPAN));
  const [postedWithin, setPostedWithin] = useState(() => spanFromParam(params.get('posted'), DEFAULT_POSTED_WITHIN));
  useQueryState({
    past: spanToParam(past, DEFAULT_SPAN),
    future: spanToParam(future, DEFAULT_SPAN),
    posted: spanToParam(postedWithin, DEFAULT_POSTED_WITHIN),
  });
  // The web of relations between the plotted pins: lines over the map, or
  // those and a graph of them beside it. Only from xl up: narrower, its
  // toggle, legend and graph would cover the map they are drawn over, so the
  // web is not offered at all - and a ?web= link opened on a phone lands on a
  // plain map rather than on lines nothing can turn off. This component only
  // ever renders in the browser (MapLoader loads it with ssr: false), so the
  // width is known from the first render.
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  const [web, setWeb] = useState<WebMode>(() => (window.matchMedia(WIDE).matches ? webModeFromParam(params.get('web')) : 'off'));
  const [webEdges, setWebEdges] = useState<WebEdge[]>([]);
  const [webNodes, setWebNodes] = useState<{ id: number; title: string }[]>([]);
  const [webPicked, setWebPicked] = useState<number | undefined>();
  const webLayerRef = useRef<L.LayerGroup | null>(null);
  const fromLayerRef = useRef<L.LayerGroup | null>(null);
  useQueryState({ web: web === 'off' ? null : web });
  // Turned to a phone's width (a rotated tablet), the web goes with its toggle.
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const resized = () => {
      setWide(query.matches);
      if (!query.matches) setWeb('off');
    };
    query.addEventListener('change', resized);
    return () => query.removeEventListener('change', resized);
  }, []);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const spot = peekMapSpot();
    const map = L.map(canvasRef.current!, spot ? { center: [spot.lat, spot.lng], zoom: spot.zoom } : { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    keepViewRef.current = !!spot;
    // Cleared once this map keeps it (see peekMapSpot).
    const cleared = spot ? setTimeout(clearSpot) : undefined;
    // Saved as the reader leaves to log in (AuthLink).
    const stopViewSource = setMapViewSource(() => ({ lat: map.getCenter().lat, lng: map.getCenter().lng, zoom: map.getZoom() }));
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
    mapRef.current = map;
    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    // Under the markers, so a line never hides a pin.
    map.createPane('web').style.zIndex = '350';
    webLayerRef.current = L.layerGroup().addTo(map);
    fromLayerRef.current = L.layerGroup().addTo(map);
    // Moving sideways reaches other copies of the world: their pins come in, and
    // the ones scrolled off go.
    map.on('moveend', () => syncCopies(map, layer, markersRef.current, categoriesRef.current));
    // Cache Components keeps a left page mounted and reruns its effects when
    // it is shown again (back to the pin, "To map" again): the new map
    // has not centered on anything or opened a popup yet.
    focusedRef.current = undefined;
    stickyRef.current = null;
    // A map with nothing better to show opens where the viewer is: their
    // granted position, or the default location on their account. Not the
    // time zone's city, which is a guess too coarse to move a map for; and
    // only while the map is still on the default view - no saved spot, no
    // pin being shown, not yet moved by the reader.
    let unmounted = false;
    if (!spot) {
      void viewerPlace().then((place) => {
        if (unmounted || !place || place.source === 'timeZone' || mapRef.current !== map || focusedRef.current !== undefined) return;
        const center = map.getCenter();
        if (map.getZoom() !== DEFAULT_ZOOM || center.lat !== DEFAULT_CENTER[0] || center.lng !== DEFAULT_CENTER[1]) return;
        map.setView([place.latitude, place.longitude], HOME_ZOOM);
      });
    }
    return () => {
      unmounted = true;
      clearTimeout(cleared);
      stopViewSource();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      webLayerRef.current = null;
      fromLayerRef.current = null;
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

    const now = new Date();
    const pastBoundary = past ? offsetDate(now, past, -1) : null;
    const futureBoundary = future ? offsetDate(now, future, 1) : null;
    const seen = new Set<number>();

    const stick = (pin: MapPinJson, at: L.LatLng) => stickPopup(map, stickyRef, pin, at, setWebPicked);

    const plot = (pins: MapPinJson[]) => {
      for (const pin of pins) {
        if (seen.has(pin.id) || pin.latitude == null || pin.longitude == null) continue;
        const focus = pin.id === focusId;
        const start = new Date(pin.utcStartDateTime);
        if (!focus && ((pastBoundary && start < pastBoundary) || (futureBoundary && start > futureBoundary))) continue;
        seen.add(pin.id);
        const icon = pinIcon(localStart(pin) <= now);
        const make = (offset: number) => {
          const marker = L.marker([pin.latitude!, pin.longitude! + 360 * offset], { icon, title: pin.title });
          // Opens on hover, and stays open while the pointer moves from the marker
          // onto the popup so its link can be clicked. Not bindPopup: its click
          // handler toggles, which would close a hover-opened popup (and a tap's
          // emulated mouseover). No autoPan: panning under the pointer ends the hover.
          const popup = pinPopup(pin).setLatLng(marker.getLatLng());
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
            stick(pin, marker.getLatLng());
          };
          marker.on({ mouseover: open, mouseout: closeSoon, click });
          return marker;
        };
        markersRef.current.push({ pin, categories: (pin.categories ?? []).map((c) => c.toLowerCase()), focus, copies: new Map(), make });
        if (focus && focusedRef.current !== pin.id) {
          focusedRef.current = pin.id;
          setFocusPin(pin);
          // The pin's copy nearest the current view, so the map does not swing a world away.
          const at = L.latLng(pin.latitude, pin.longitude + 360 * nearestOffset(pin.longitude, map.getCenter().lng));
          if (!keepViewRef.current) map.setView(at, Math.max(map.getZoom(), 11));
          stick(pin, at);
        }
      }
      syncCopies(map, layer, markersRef.current, categoriesRef.current);
      setCount(markersRef.current.filter((e) => e.focus || inCategories(e.categories, categoriesRef.current)).length);
    };

    // Every pin to plot, in one request: the window, the posted-within cutoff
    // and "has a place at all" are all the server's to apply. The boundaries
    // go over as resolved instants so they are the same ones plot compares
    // against. A search reaches the same endpoint through its q.
    const load = async () => {
      const searchParams = new URLSearchParams();
      if (fetchQuery) searchParams.set('q', fetchQuery);
      if (watched) searchParams.set('f', 'watch');
      if (pastBoundary) searchParams.set('from', pastBoundary.toISOString());
      if (futureBoundary) searchParams.set('to', futureBoundary.toISOString());
      if (postedWithin) searchParams.set('created_within', postedWithin);
      const res = await fetch(withPageLang(`/api/pins/map?${searchParams.toString()}`));
      if (!res.ok) throw new Error(res.statusText);
      const { pins } = (await res.json()) as { pins: MapPinJson[] };
      if (!cancelled) plot(pins);
    };

    // The focused pin may fall outside the search or time window, so it is
    // fetched on its own; whichever answer plots it first wins.
    if (focusId) {
      fetch(withPageLang(`/api/pins/${focusId}`))
        .then((res) => (res.ok ? (res.json() as Promise<PinJson>) : null))
        .then((pin) => {
          if (pin && !cancelled) plot([pin]);
        })
        .catch(() => {});
    }

    (async () => {
      try {
        await load();
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
    syncCopies(map, layer, markersRef.current, picks);
    setCount(markersRef.current.filter((e) => e.focus || inCategories(e.categories, picks)).length);
  }, [categoryKey]);

  // The relations among the pins the map is showing. Fetched when the web is
  // on and the pins or the category picks change, and redrawn as lines.
  useEffect(() => {
    const web$ = webLayerRef.current;
    if (!web$) return;
    web$.clearLayers();
    if (web === 'off' || status !== 'ready') return;
    let cancelled = false;
    const shown = markersRef.current.filter((e) => e.focus || inCategories(e.categories, categoriesRef.current));
    const byId = new Map(shown.map((e) => [e.pin.id, e.pin]));
    fetch('/api/pins/graph', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...byId.keys()].slice(0, 5000) }) })
      .then((res) => (res.ok ? (res.json() as Promise<{ edges: WebEdge[] }>) : { edges: [] }))
      .then(({ edges }) => {
        if (cancelled) return;
        for (const { a, b, kind, label, strength, shared } of edges) {
          const from = byId.get(a);
          const to = byId.get(b);
          if (!from || !to) continue;
          // The copy of the world where the two are nearest, so a line never crosses the map.
          const toLng = to.longitude! + 360 * nearestOffset(to.longitude!, from.longitude!);
          // The more the two share, the heavier and more solid their line.
          const firm = webIntensity(strength);
          const line = L.polyline([[from.latitude!, from.longitude!], [to.latitude!, toLng]], {
            color: webColor(kind),
            weight: 1.5 + firm * 1.5,
            opacity: 0.45 + firm * 0.35,
            pane: 'web',
          });
          // Clicked: why the two are joined, as a popup in the map's own
          // styling. Leaflet stops the click reaching the map and opens a
          // path's popup where it was clicked, so it lands on the line.
          const also = shared && shared > 1 ? t('map.web.alsoShared', { count: shared - 1 }) : undefined;
          line.bindPopup(() => webPopupContent(from, to, kind, t(`map.web.${kind}`), label, also), {
            className: 'pin-popup',
            minWidth: WEB_POPUP_WIDTH,
            maxWidth: WEB_POPUP_WIDTH,
            closeButton: false,
            autoPan: false,
          });
          line.addTo(web$);
        }
        setWebEdges(edges);
        setWebNodes(shown.map((e) => ({ id: e.pin.id, title: e.pin.title })));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [web, status, categoryKey, fetchQuery, past, future, postedWithin, watched, t]);

  // "1,240 km from Los Angeles" clicked on a pin: the line it measured, from
  // where the viewer's browser puts them to the pin, once that pin is plotted.
  // A great circle rather than a straight segment, so the curve on the flat
  // map is the distance the label states.
  useEffect(() => {
    const map = mapRef.current;
    const layer = fromLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!fromMe || focusPin?.latitude == null || focusPin.longitude == null) return;
    const pin = { latitude: focusPin.latitude, longitude: focusPin.longitude };
    let cancelled = false;
    void viewerPlace().then((place) => {
      if (cancelled || !place || !fromLayerRef.current) return;
      // The copy of the world the focused pin was centered on, which is the one
      // holding its popup, and the viewer on the copy nearest that: the line
      // then ends at the pin the map is showing and takes the short way round
      // rather than back across the whole map.
      const to = { latitude: pin.latitude, longitude: pin.longitude + 360 * nearestOffset(pin.longitude, map.getCenter().lng) };
      const from = { latitude: place.latitude, longitude: place.longitude + 360 * nearestOffset(place.longitude, to.longitude) };
      const distance = formatDistance(distanceKm(from, to), usesImperial(), t.locale);
      const line = L.polyline(greatCirclePoints(from, to), {
        color: FROM_COLOR,
        weight: 2.5,
        opacity: 0.85,
        dashArray: '8 6',
        pane: 'web',
      }).addTo(layer);
      line.bindTooltip(place.name ? t('pin.distanceFrom', { distance, place: place.name }) : t('pin.distanceAway', { distance }), {
        permanent: true,
        direction: 'center',
        className: 'from-line-label',
      });
      // Where the measuring started, which is a city for most viewers and
      // never finer than about a kilometre (see viewerPlace).
      L.circleMarker([from.latitude, from.longitude], {
        radius: 6,
        color: FROM_COLOR,
        weight: 2,
        fillColor: FROM_COLOR,
        fillOpacity: 0.5,
        pane: 'web',
      })
        .addTo(layer)
        .bindTooltip(place.name ?? t('map.yourPlace'), { direction: 'top' });
      // Both ends in view: the whole line is the point of coming here. The
      // right-hand room is for the controls, which sit over the map on a wide
      // screen and would otherwise cover the pin and its popup; narrower they
      // fold into the pills along the bottom.
      const wide = map.getSize().x >= 1280;
      map.fitBounds(line.getBounds(), {
        paddingTopLeft: [56, 56],
        paddingBottomRight: wide ? [300, 56] : [56, 120],
        maxZoom: 11,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [fromMe, focusPin, t]);

  // A graph node picked: the map goes to that pin.
  function showPin(id: number) {
    const map = mapRef.current;
    const pin = markersRef.current.find((e) => e.pin.id === id)?.pin;
    if (!map || !pin) return;
    const at = L.latLng(pin.latitude!, pin.longitude! + 360 * nearestOffset(pin.longitude!, map.getCenter().lng));
    map.setView(at, Math.max(map.getZoom(), 6));
    // Also the hover popup still open from the pointer's last pass over a marker.
    map.closePopup();
    stickPopup(map, stickyRef, pin, at, setWebPicked);
  }

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

  const phrase = (span: string | null) => spanPhrase(span, t.locale);
  const hasPast = !!past && past !== '0d';
  const hasFuture = !!future && future !== '0d';

  return (
    // isolate: the controls need z-[1000] to sit over Leaflet's panes, but that
    // must stay inside the map, under the navbar's menus and panels.
    <div className="relative isolate h-[calc(100dvh-52px)]">
      {/* With the back button above them, Leaflet's zoom buttons move down a
          row; pins-map (globals.css) lifts the attribution over the pills. */}
      <div ref={canvasRef} className={`pins-map absolute inset-0 z-0 ${focusId ? '[&_.leaflet-top.leaflet-left]:pt-10' : ''}`} />
      {focusId ? (
        // Above Leaflet's zoom buttons. Back through history when the map was
        // reached inside the app (the pin page's link), so the pin page is not
        // stacked twice; a real link to the pin when the page was loaded as
        // the map (a shared link, a new tab, a reload), where back leaves.
        <a
          href={localizeHere(focusPin?.id === focusId ? pinPath(focusPin) : `/pin/${focusId}`)}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0 || loadedAsMap()) return;
            event.preventDefault();
            router.back();
          }}
          className="floating absolute top-2.5 left-2.5 z-[1000] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-raised hover:no-underline active:bg-raised-2"
        >
          <Icon name="back" className="size-4 text-link" />
          {t('map.backToPin')}
        </a>
      ) : null}
      {/* As on the timeline: top right on wide screens, folded behind pills at
          the bottom narrower. Its fixed panels stack inside this z-[1000], over
          Leaflet's panes. */}
      <div className="relative z-[1000]">
        <FloatingControls
          merge
          typing={sliderTyping}
          tagList={tagList}
          summaryCaption={t('controls.postedWithin')}
          summary={spanLabel(postedWithin, t.locale)}
          tags={{
            summary: tagPillSummary(query, t.locale),
            // The timeline's own tag cloud. A pick stays on the map: it edits
            // the query the map is showing rather than leaving for the search
            // results, and a category pick only shows and hides markers.
            control: <TagCloud query={query} onlyWatched={watched} postedWithin={postedWithin} onQuery={go} />,
          }}
          span={{
            summary: eventSpanSummary(past, future, t.locale),
            control: (
              <TimeRangeSlider
                steps={EVENT_SPAN_OPTIONS}
                past={past}
                future={future}
                collapsible
                onChange={(value) => {
                  setPast(value.past);
                  setFuture(value.future);
                }}
              />
            ),
          }}
        >
          <TimeRangeSlider steps={SPAN_OPTIONS} past={postedWithin} pastOnly collapsible onChange={(value) => setPostedWithin(value.past)} />
        </FloatingControls>
      </div>
      {/* The web toggle, with the graph above it when it is on. */}
      {wide ? (
        <div className="absolute bottom-8 left-2.5 z-[999] flex w-[min(26rem,calc(100%-1.25rem))] flex-col items-start gap-2">
          {web === 'graph' ? (
            <div className="floating h-72 w-full overflow-hidden">
              <PinWebGraph nodes={webNodes} edges={webEdges} selectedId={webPicked} onSelect={showPin} />
            </div>
          ) : null}
          {web !== 'off' ? <WebLegend /> : null}
          <div className="floating flex items-center gap-1 rounded-full p-1 text-sm">
            <Icon name="web" className="ml-2 size-4 text-muted" />
            {(['off', 'lines', 'graph'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={web === mode}
                onClick={() => setWeb(web === mode ? 'off' : mode)}
                className={`rounded-full px-2.5 py-1 ${web === mode ? 'bg-accent text-white' : 'text-muted hover:text-ink'}`}
              >
                {mode === 'off' ? t('map.webOff') : mode === 'lines' ? t('map.lines') : t('map.graph')}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {/* Narrower, clear of the pills at the bottom, and a layer under the
          controls so an open fold covers it rather than the other way round. */}
      {status === 'loading' ? (
        <p role="status" className="floating absolute bottom-24 left-1/2 z-[999] -translate-x-1/2 rounded-full px-4 py-2 text-sm text-ink xl:bottom-8">{t('map.loadingPins')}</p>
      ) : status === 'error' ? (
        <p role="alert" className="floating absolute bottom-24 left-1/2 z-[999] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm text-ink xl:bottom-8">
          {t('search.unavailable')}
        </p>
      ) : count === 0 ? (
        <p className="floating absolute bottom-24 left-1/2 z-[999] w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm text-ink xl:bottom-8">
          {[
            t(watched ? 'map.noWatchedPins' : 'map.noPins'),
            fetchQuery ? t('map.matching', { query: fetchQuery }) : '',
            t('map.withLocation'),
            hasPast ? t('map.inLast', { span: phrase(past) }) : '',
            hasPast && hasFuture ? t('common.or') : '',
            hasFuture ? t('map.inNext', { span: phrase(future) }) : '',
          ]
            .filter(Boolean)
            .join(' ')}
          {postedWithin ? t('map.postedInLast', { span: phrase(postedWithin) }) : ''}
          {categories.length ? ` ${t('map.inCategories', { categories: categories.map((c) => categoryLabel(t, c)).join(` ${t('common.or')} `) })}` : ''}
          {t('map.period')}
        </p>
      ) : null}
    </div>
  );
}
