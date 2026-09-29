// The pictures behind the site's share card (src/app/og/site/route.tsx): the
// newest pins' thumbs, cropped to the collage's tiles and inlined, so the card
// a link to the home page previews with shows what was pinned lately.

import { cacheLife } from 'next/cache';
import sharp from 'sharp';
import { blobUrl } from '@/lib/appConfig';
import Pins from '../model/pins';
import PinView from '../model/pinView';
import log from '../util/log';
import { timelineMinConfidence } from './timeline';

export const COLLAGE = { columns: 5, rows: 3, width: 1200, height: 630 };
export const TILE = { width: COLLAGE.width / COLLAGE.columns, height: COLLAGE.height / COLLAGE.rows };
const TILES = COLLAGE.columns * COLLAGE.rows;

// Pins looked through for pictures: most have one, but not all, and a
// duplicate often shares its original's.
const CANDIDATES = 60;
// A thumb that stalls leaves its tile to the next picture rather than
// holding a crawler's request open.
const FETCH_TIMEOUT_MS = 5_000;

// One thumb as a JPEG data URI the size of a tile, or null when it could not
// be fetched or read.
async function tile(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()), { failOn: 'none' })
      .rotate()
      .resize(TILE.width, TILE.height, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch (err) {
    log.warn(`share collage: skipped ${url} (${(err as Error).message})`);
    return null;
  }
}

// Up to a collage's worth of tiles from the pins added most recently, newest
// first. Cached for a day: the card is a daily picture of the site, not a
// live feed, and building it fetches fifteen pictures.
export async function shareCollage(): Promise<string[]> {
  'use cache';
  cacheLife('days');
  const pins = await Pins.newest(CANDIDATES, await timelineMinConfidence());
  const pictures = await PinView.pictures(pins.map((p) => p.id));
  const urls = [...new Set(pins.map((p) => blobUrl(pictures.get(p.id)?.thumbName)).filter((u): u is string => !!u))];
  const tiles: string[] = [];
  // A collage's worth at a time, stopping once it is full.
  for (let i = 0; i < urls.length && tiles.length < TILES; i += TILES) {
    const batch = await Promise.all(urls.slice(i, i + TILES).map(tile));
    tiles.push(...batch.filter((t): t is string => !!t));
  }
  // Every thumb failing is the blob store down, not a day with no pictures:
  // throw rather than cache a bare card for a day.
  if (!tiles.length && urls.length) throw new Error('share collage: no thumb could be fetched');
  return tiles.slice(0, TILES);
}
