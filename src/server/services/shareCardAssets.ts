// What a pin's share card keeps in Azure Blob Storage (services/pinCard.tsx):
// a collage and a map under share/pin/<id>/, each named by a hash of what it
// is made from. Kept apart from pinCard.tsx so a pin edit can prune the files
// it made stale without loading the image renderer.

import { createHash } from 'node:crypto';
import { blobUrl } from '@/lib/appConfig';
import { toJson, type PinJson } from '@/lib/types';
import { deleteThumb, listThumbNames } from '../azureBlob';
import config from '../config';
import Pin from '../model/pin';
import log from '../util/log';

export const MAX_THUMBS = 6;
export const MAP_ZOOM = 15;

export const sharePrefix = (id: number) => `share/pin/${id}/`;
export const shareName = (id: number, kind: 'collage' | 'map', hash: string) => `${sharePrefix(id)}${kind}-${hash}.jpg`;

const hashOf = (parts: string[]) => createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);

// The pictures a collage is made from: the pin's images, thumbs first.
export function pictureUrls(pin: PinJson): string[] {
  return [
    ...new Set(
      (pin.media ?? [])
        .filter((m) => String(m.type) === '1')
        .map((m) => blobUrl(m.thumbName) ?? m.originalUrl)
        .filter((u): u is string => !!u),
    ),
  ].slice(0, MAX_THUMBS);
}

// Only the pictures decide the collage and only the place decides the map, so
// an edit to the pin's words or date keeps both files.
export function collageHash(pin: PinJson): string | null {
  const urls = pictureUrls(pin);
  return urls.length ? hashOf(urls) : null;
}

export function mapHash(pin: PinJson): string | null {
  return pin.latitude != null && pin.longitude != null ? hashOf([pin.latitude.toFixed(4), pin.longitude.toFixed(4), String(MAP_ZOOM)]) : null;
}

// Deletes the pin's stored files that no longer match it (all of them when the
// pin is gone), the moment it is edited rather than when its card is next
// asked for. Best effort: a failure leaves files the next build prunes.
export async function pruneShareCard(pinId: number): Promise<void> {
  if (!config.azureStorage.connectionString) return;
  try {
    const names = await listThumbNames(sharePrefix(pinId));
    if (!names.length) return;
    const { pin } = await Pin.queryById(pinId);
    const json = pin ? toJson<PinJson>(pin) : null;
    const keep = new Set(
      json ? [collageHash(json) && shareName(pinId, 'collage', collageHash(json)!), mapHash(json) && shareName(pinId, 'map', mapHash(json)!)].filter(Boolean) : [],
    );
    await Promise.all(names.filter((n) => !keep.has(n)).map(deleteThumb));
  } catch (err) {
    log.warn(`share card: could not prune pin ${pinId} (${(err as Error).message})`);
  }
}
