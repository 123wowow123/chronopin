// What the listing routes share: the kind a pin sells as, reading a
// listing out of a request body, and the seller's uploaded photos and video.

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import * as azureBlob from '../azureBlob';
import * as db from '../db';
import { HttpError } from '../http';
import { isOwnMedia, MEDIA_PREFIX } from '../model/listing';
import log from '../util/log';
import {
  cleanDetails,
  DESCRIPTION_MAX,
  listingKindOf,
  listingProblem,
  PHOTO_MAX_BYTES,
  storedTitle,
  VIDEO_MAX_BYTES,
  type ListingInput,
  type ListingKind,
} from '@/lib/listings';
import { locationProblem, roundCoordinate } from '@/lib/location';

// The kind a pin's listings are, or null when it names no product to sell.
export async function pinListingKind(pinId: number): Promise<ListingKind | null> {
  const [pin] = await db.query<{ productName: string | null; categories: string[] }>(
    `SELECT "p"."productName", ARRAY(SELECT "t"."name"::text FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category') AS "categories"
     FROM "Pin" AS "p" WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin) throw new HttpError(404, 'Not Found');
  return listingKindOf(pin);
}

// The listing in a request body, checked for its kind. Media must be the
// seller's own uploads; the place is rounded as a default location is.
export function readListingInput(kind: ListingKind, body: Record<string, unknown>, userId: number): ListingInput {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const price = body.price == null || body.price === '' ? null : Number(body.price);
  const photos = Array.isArray(body.photos) ? body.photos.filter((p): p is string => typeof p === 'string') : [];
  const video = typeof body.video === 'string' && body.video ? body.video : null;
  if ([...photos, video].some((name) => name && !isOwnMedia(userId, name))) {
    throw new HttpError(422, '', { code: 'invalid', field: 'photos', message: 'photos and video must be your own uploads' });
  }
  let location: ListingInput['location'] = null;
  if (body.location && typeof body.location === 'object') {
    const place = body.location as Record<string, unknown>;
    if (locationProblem(place)) throw new HttpError(422, '', { code: 'invalid', field: 'location', message: 'location needs a latitude, longitude and name' });
    location = {
      latitude: roundCoordinate(place.latitude as number),
      longitude: roundCoordinate(place.longitude as number),
      name: typeof place.name === 'string' ? place.name.trim() : null,
    };
  }
  const input: ListingInput = {
    title: str(body.title).trim(),
    price: price != null && Number.isFinite(price) ? Math.round(price * 100) / 100 : price,
    description: str(body.description).trim().slice(0, DESCRIPTION_MAX + 1),
    details: cleanDetails(kind, body.details && typeof body.details === 'object' ? (body.details as Record<string, unknown>) : {}),
    photos: [...new Set(photos)],
    video,
    location,
  };
  const problem = listingProblem(kind, input);
  if (problem) throw new HttpError(422, '', { code: problem.code, field: problem.field, message: `${problem.field} is ${problem.code}` });
  return { ...input, title: storedTitle(kind, input) };
}

const VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };

// Stores one uploaded photo or video for a listing still being written and
// returns its blob name. A photo is turned upright and brought down to 1600
// pixels on its long side as a JPEG; a video is kept as sent (the form holds
// it to a minute).
export async function saveListingMedia(userId: number, file: File): Promise<{ name: string; type: 'photo' | 'video' }> {
  const base = `${MEDIA_PREFIX}${userId}-${randomUUID()}`;
  if (VIDEO_TYPES[file.type]) {
    if (file.size > VIDEO_MAX_BYTES) throw new HttpError(413, '', { code: 'tooLarge', message: 'Videos can be up to 100 MB' });
    const name = `${base}.${VIDEO_TYPES[file.type]}`;
    await azureBlob.uploadThumb(name, Buffer.from(await file.arrayBuffer()), file.type);
    return { name, type: 'video' };
  }
  if (!/^image\//.test(file.type)) throw new HttpError(400, '', { code: 'type', message: 'Choose a photo or a video' });
  if (file.size > PHOTO_MAX_BYTES) throw new HttpError(413, '', { code: 'tooLarge', message: 'Photos can be up to 15 MB' });
  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(400, '', { code: 'type', message: 'That file is not an image we can read' });
  }
  const name = `${base}.jpg`;
  await azureBlob.uploadThumb(name, jpeg, 'image/jpeg');
  return { name, type: 'photo' };
}

// Media a listing no longer uses. Best effort: a blob left behind costs
// little, a failed save would cost the seller their edit.
export function deleteListingMedia(names: string[] | null) {
  for (const name of names ?? []) {
    if (!name.startsWith(MEDIA_PREFIX)) continue;
    azureBlob.deleteThumb(name).catch((err) => log.warn('listing media delete failed:', name, (err as Error).message));
  }
}
