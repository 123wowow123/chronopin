// The share card for a pin (src/app/og/pin/[id]): a dimmed collage of its
// pictures behind its title, a countdown and a street-map panel. Built for
// cheap repeats: the collage and map are persisted in Azure Blob Storage and
// only rebuilt when the pin's pictures or place change; the finished card is a
// small JPEG kept in a bounded in-memory cache, and a build already running is
// shared by concurrent requests (crawlers hit one pin several times at once).

import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { PIN, PINS } from '@/components/ui/LogoMark';
import { siteName } from '@/lib/appConfig';
import { plainText } from '@/lib/format';
import type { PinJson } from '@/lib/types';
import { deleteThumb, getBlobUrl, listThumbNames, uploadThumb } from '../azureBlob';
import config from '../config';
import log from '../util/log';
import { collageHash, MAP_ZOOM, mapHash, pictureUrls, shareName, sharePrefix } from './shareCardAssets';

const W = 1200;
const H = 630;
const MAP = { width: 440, height: 550 };
const FETCH_TIMEOUT_MS = 3_000;
const CACHE_MAX = 300;

const LOGO = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2.3 31.2 31.2">${PINS.map(
    ({ fill, tip: [x, y], scale }) =>
      `<path d="${PIN}" fill="${fill}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${scale}) translate(-16 -31)"/>`,
  ).join('')}</svg>`,
).toString('base64')}`;

// Accent by state, so a glance tells upcoming from live from over.
const ACCENT = { upcoming: '#ff5a4d', live: '#3ddc97', past: '#8a90a0', predicted: '#b57bff' } as const;

type Count = { state: keyof typeof ACCENT; tiles: { n: string; unit: string }[]; label?: string };

// Days and hours only: the card is cached by the hour, so a minute tile
// would be stale on arrival.
export function countdown(pin: Pick<PinJson, 'utcStartDateTime' | 'utcEndDateTime' | 'dateConfidence'>, now = Date.now()): Count {
  const start = Date.parse(pin.utcStartDateTime);
  const end = pin.utcEndDateTime ? Date.parse(pin.utcEndDateTime) : start + 3 * 3_600_000;
  const predicted = pin.dateConfidence === 'estimated';
  if (now >= start && now <= end) return { state: 'live', tiles: [], label: 'Happening now' };
  if (now > end) {
    const days = Math.max(1, Math.floor((now - end) / 86_400_000));
    return { state: 'past', tiles: [{ n: String(days), unit: days === 1 ? 'day ago' : 'days ago' }] };
  }
  const hours = Math.floor((start - now) / 3_600_000);
  return {
    state: predicted ? 'predicted' : 'upcoming',
    tiles: [
      { n: String(Math.floor(hours / 24)), unit: 'days' },
      { n: String(hours % 24).padStart(2, '0'), unit: 'hrs' },
    ],
  };
}

const ZOOM = MAP_ZOOM;
const TILE_PX = 256;
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
// OpenStreetMap's tile policy asks for an identifying User-Agent and for tiles
// to be cached rather than refetched.
const TILE_HEADERS = { 'User-Agent': 'ChronoPin/1.0 (https://chronopin.com) share card map' };

const tiles = new Map<string, Buffer>();
async function osmTile(x: number, y: number): Promise<Buffer | null> {
  const key = `${x}/${y}`;
  const hit = tiles.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(TILE_URL.replace('{z}', String(ZOOM)).replace('{x}', String(x)).replace('{y}', String(y)), {
      headers: TILE_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const png = Buffer.from(await res.arrayBuffer());
    tiles.set(key, png);
    while (tiles.size > 400) tiles.delete(tiles.keys().next().value!);
    return png;
  } catch (err) {
    log.warn(`pin card: map tile ${key} skipped (${(err as Error).message})`);
    return null;
  }
}

// The street map around a point as a JPEG, the marker at its
// centre: the OpenStreetMap tiles under the panel, stitched and cropped. Null
// when any tile is missing, so the card shows no map rather than a torn one.
async function streetMap(lat: number, lng: number): Promise<Buffer | null> {
  const color = ACCENT.upcoming;
  const n = 2 ** ZOOM;
  const px = ((lng + 180) / 360) * n * TILE_PX;
  const rad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * TILE_PX;
  const left = Math.floor(px - MAP.width / 2);
  const top = Math.floor(py - MAP.height / 2);
  const x0 = Math.floor(left / TILE_PX);
  const y0 = Math.floor(top / TILE_PX);
  const x1 = Math.floor((left + MAP.width - 1) / TILE_PX);
  const y1 = Math.floor((top + MAP.height - 1) / TILE_PX);
  const coords: { x: number; y: number }[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) coords.push({ x, y });
  const got = await Promise.all(coords.map(({ x, y }) => osmTile(x, y)));
  if (!got.every(Boolean)) return null;
  const cx = Math.round(px - left);
  const cy = Math.round(py - top);
  const marker = `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP.width}" height="${MAP.height}"><circle cx="${cx}" cy="${cy}" r="34" fill="${color}" fill-opacity=".3"/><circle cx="${cx}" cy="${cy}" r="14" fill="${color}" stroke="#fff" stroke-width="4"/></svg>`;
  // Two stages: sharp applies an extract before any composite, so the stitched
  // canvas is made first and cropped from its own pipeline.
  const stitched = await sharp({ create: { width: (x1 - x0 + 1) * TILE_PX, height: (y1 - y0 + 1) * TILE_PX, channels: 3, background: '#e8e8e8' } })
    .composite(got.map((input, i) => ({ input: input!, left: (coords[i].x - x0) * TILE_PX, top: (coords[i].y - y0) * TILE_PX })))
    .png()
    .toBuffer();
  const jpeg = await sharp(stitched)
    .extract({ left: left - x0 * TILE_PX, top: top - y0 * TILE_PX, width: MAP.width, height: MAP.height })
    .composite([{ input: Buffer.from(marker) }])
    .jpeg({ quality: 70 })
    .toBuffer();
  return jpeg;
}

async function thumb(url: string, width: number, height: number): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer()), { failOn: 'none' })
      .rotate()
      .resize(width, height, { fit: 'cover' })
      .jpeg({ quality: 60 })
      .toBuffer();
  } catch (err) {
    log.warn(`pin card: skipped ${url} (${(err as Error).message})`);
    return null;
  }
}

// The collage as one full-card JPEG: one picture, two halves, or a 3x2 mosaic
// that repeats pictures to fill when there are three to five. Null when no
// picture could be fetched.
async function collage(urls: string[]): Promise<Buffer | null> {
  const [tw, th] = urls.length === 1 ? [W, H] : urls.length === 2 ? [W / 2, H] : [W / 3, H / 2];
  const got = (await Promise.all(urls.map((u) => thumb(u, tw, th)))).filter((b): b is Buffer => !!b);
  if (!got.length) return null;
  // Sizes and cells follow the requested count, so a failed fetch only
  // changes how many pictures repeat to fill them.
  const cells = urls.length === 1 ? 1 : urls.length === 2 ? 2 : 6;
  const perRow = Math.round(W / tw);
  return sharp({ create: { width: W, height: H, channels: 3, background: '#0e1220' } })
    .composite(Array.from({ length: cells }, (_, i) => ({ input: got[i % got.length], left: (i % perRow) * tw, top: Math.floor(i / perRow) * th })))
    .jpeg({ quality: 70 })
    .toBuffer();
}

// The collage and map are generated once and kept in Azure Blob Storage under
// share/pin/<id>/, named by a hash of what they are made from: the picture
// URLs for the collage, the coordinates for the map. Editing a pin's words or
// date changes neither, so neither is rebuilt; changing its pictures or place
// writes a new file and deletes the old one. The card's words and countdown
// are drawn fresh on top, from these files, with no tile or thumb fetch.
const assets = new Map<string, string>();
const assetBuilds = new Map<string, Promise<string | null>>();

async function persisted(pinId: number, kind: 'collage' | 'map', hash: string, make: () => Promise<Buffer | null>): Promise<string | null> {
  const name = shareName(pinId, kind, hash);
  const hit = assets.get(name);
  if (hit) return hit;
  let pending = assetBuilds.get(name);
  if (!pending) {
    pending = (async () => {
      let jpeg: Buffer | null = null;
      if (config.azureStorage.connectionString) {
        const res = await fetch(getBlobUrl(name), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
        if (res?.ok) jpeg = Buffer.from(await res.arrayBuffer());
      }
      if (!jpeg) {
        jpeg = await make();
        if (!jpeg) return null;
        // Stored and pruned in the background: the card does not wait on it.
        if (config.azureStorage.connectionString) {
          const stored = jpeg;
          void (async () => {
            await uploadThumb(name, stored, 'image/jpeg', 'public, max-age=31536000, immutable');
            const stale = (await listThumbNames(sharePrefix(pinId))).filter((n) => n.startsWith(`${sharePrefix(pinId)}${kind}-`) && n !== name);
            await Promise.all(stale.map(deleteThumb));
          })().catch((err: Error) => log.warn(`pin card: could not store ${name} (${err.message})`));
        }
      }
      const uri = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
      assets.set(name, uri);
      while (assets.size > 60) assets.delete(assets.keys().next().value!);
      return uri;
    })().finally(() => assetBuilds.delete(name));
    assetBuilds.set(name, pending);
  }
  return pending;
}

async function render(pin: PinJson): Promise<Buffer> {
  const c = countdown(pin);
  const accent = ACCENT[c.state];
  const [cHash, mHash] = [collageHash(pin), mapHash(pin)];
  const [picture, map] = await Promise.all([
    cHash ? persisted(pin.id, 'collage', cHash, () => collage(pictureUrls(pin))) : null,
    mHash ? persisted(pin.id, 'map', mHash, () => streetMap(pin.latitude!, pin.longitude!)) : null,
  ]);
  const date = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(pin.utcStartDateTime));
  const place = pin.address ? pin.address.split(',').slice(-3).join(',').trim() : '';
  const tag = pin.categories?.[0];
  const hasMap = !!map;
  // The map panel already names the place.
  const meta = [date, pin.company, hasMap ? '' : place].filter(Boolean).join(' · ');

  const card = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', background: '#0e1220', color: '#ededed' }}>
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picture} width={W} height={H} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
        ) : null}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: 'flex',
            background: picture
              ? 'linear-gradient(90deg, rgba(11,13,18,0.95) 0%, rgba(11,13,18,0.85) 45%, rgba(11,13,18,0.65) 100%)'
              : 'linear-gradient(135deg, #141a2b, #0e1220)',
          }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: hasMap ? W - MAP.width - 32 : W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 700 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} width={44} height={44} alt="" />
            <span>{siteName}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tag ? (
              <div style={{ display: 'flex' }}>
                <span style={{ fontSize: 22, padding: '6px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.1)', color: '#b9c0d4' }}>{tag}</span>
              </div>
            ) : null}
            <div style={{ fontSize: pin.title.length > 70 ? 40 : pin.title.length > 40 ? 48 : 58, fontWeight: 700, lineHeight: 1.12 }}>{plainText(pin.title, 110)}</div>
            <div style={{ fontSize: 26, color: '#9aa2b8' }}>{meta}</div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {c.tiles.map((t) => (
              <div key={t.unit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110, padding: '10px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <span style={{ fontSize: 52, fontWeight: 700 }}>{t.n}</span>
                <span style={{ fontSize: 18, color: '#9aa2b8', textTransform: 'uppercase', letterSpacing: 1 }}>{t.unit}</span>
              </div>
            ))}
            {c.label ? <span style={{ fontSize: 34, fontWeight: 700, color: accent }}>● {c.label}</span> : null}
            {c.state === 'predicted' ? <span style={{ alignSelf: 'center', fontSize: 22, color: accent }}>Predicted</span> : null}
          </div>
        </div>
        {hasMap ? (
          <div style={{ position: 'absolute', top: 40, right: 40, width: MAP.width, height: MAP.height, display: 'flex', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={map!} width={MAP.width} height={MAP.height} alt="" />
            {place ? (
              <span style={{ position: 'absolute', left: 16, top: 16, fontSize: 22, padding: '6px 14px', borderRadius: 10, background: 'rgba(11,13,18,0.8)' }}>{place}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    ),
    { width: W, height: H },
  );
  // A JPEG is a fraction of Satori's PNG (see siteCard.tsx) and link previews
  // load it faster.
  return sharp(Buffer.from(await card.arrayBuffer())).flatten({ background: '#0e1220' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
}

// Bounded LRU keyed by everything the picture shows. The hour is part of the
// key because the countdown is, so a card is rebuilt at most once an hour.
const cache = new Map<string, Buffer>();
const building = new Map<string, Promise<Buffer>>();

export async function pinCardJpeg(pin: PinJson): Promise<Buffer> {
  const key = `${pin.id}:${pin.utcUpdatedDateTime ?? ''}:${Math.floor(Date.now() / 3_600_000)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  let pending = building.get(key);
  if (!pending) {
    pending = render(pin)
      .then((jpeg) => {
        cache.set(key, jpeg);
        while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
        return jpeg;
      })
      .finally(() => building.delete(key));
    building.set(key, pending);
  }
  return pending;
}
