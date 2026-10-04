import { randomUUID } from 'node:crypto';
import getVideoId from 'get-video-id';
import _ from 'lodash';
import { mediumID } from '@/lib/appConfig';
import { videoPlayerHtml } from '@/lib/embedHtml';
import { videoSource, youtubeEmbedHtml } from '@/lib/videoEmbed';
import { getClip } from '../scrape/twitch';
import * as azureBlob from '../azureBlob';
import * as db from '../db';
import type { QueryFn, Row } from '../db';
import * as image from '../image';
import { isNearDuplicate } from '../imageHash';
import log from '../util/log';
import BasePin from './basePin';

const prop = [
  'id',
  'thumbName',
  'thumbWidth',
  'thumbHeight',
  'originalUrl',
  'originalWidth',
  'originalHeight',
  'type',
  'utcCreatedDateTime',
  'utcDeletedDateTime',
  // How much it counts on its pin, 0 to 1 (0090): lowered by a checked
  // suggestion, and media sort by it (byWeight).
  'weight',
  // For twitter and youtube
  'authorName',
  'authorUrl',
  'html',
];

export default class Medium {
  [key: string]: any;
  declare _pin?: BasePin;
  // The picture's fingerprint (../imageHash.ts), for telling a new medium from
  // one the pin already has. Underscored because it is worked out as the thumb
  // is made and never stored: toJSON leaves it out, so it reaches neither the
  // API nor the seed data.
  declare _imageHash?: string;
  declare id: number;
  declare type: number;
  declare originalUrl: string;
  declare thumbName: string;

  constructor(medium?: Row | null, pin?: BasePin | null) {
    if (medium) {
      this.set(medium, pin);
    }
  }

  set(medium: Row, pin?: BasePin | null): this {
    if (!medium) {
      throw new Error('medium cannot set value of arg');
    }
    for (const key of prop) {
      this[key] = medium[key];
    }

    if (pin instanceof BasePin) {
      this._pin = pin;
    } else if (medium._pin && medium._pin instanceof BasePin) {
      this._pin = medium._pin;
    } else if (Number.isInteger(medium.pinId)) {
      this.pinId = medium.pinId;
    }
    return this;
  }

  // Saves the medium as a new row, linked to its pin when it has one. Every
  // pin gets its own Medium row even for a URL already stored: removing a
  // medium from a pin deletes the row, so a shared row would vanish from the
  // other pins too. (The Express version meant to share rows but its check
  // never matched, so this is what it always did.)
  async save(): Promise<this> {
    this.fillEmbed();
    const pinId = this._pin?.id;
    return pinId ? createPinMediumLink(this, pinId) : createMedium(this);
  }

  async createAndSaveToCDN(): Promise<this> {
    const { _imageHash, ...newMedium } = await getImageStatAndSaveImage(this.originalUrl);
    this.set(newMedium)._imageHash = _imageHash;
    return this.save();
  }

  // Saves a new medium of any type with its thumb: an image's own, or a
  // YouTube video's still, so places that cannot play the video (the map's
  // popup) have a picture. A video without a still saves anyway.
  async saveWithThumb(): Promise<this> {
    await this.addThumb();
    return this.save();
  }

  // saveWithThumb's CDN half, which writes no row: a pin update fetches its
  // new media's thumbs before its transaction opens.
  async addThumb(): Promise<this> {
    const type = Number(this.type);
    if (type === mediumID.image) {
      const { _imageHash, ...newMedium } = await getImageStatAndSaveImage(this.originalUrl);
      this.set(newMedium)._imageHash = _imageHash;
      return this;
    }
    if (type === mediumID.youtube && !this.thumbName) {
      await this.addVideoThumb().catch((err) => log.error('video-thumb error:', err));
    }
    this.fillEmbed();
    return this;
  }

  // addThumb for a picture already downloaded and shrunk
  // (image.createThumbFromUrl), so one that was looked at before it was kept
  // is uploaded without being fetched again.
  async addDownloadedThumb(thumb: ThumbMeta): Promise<this> {
    const { buffer: _buffer, mimeType: _mimeType, hash, ...saved } = await mapAndSaveThumb(thumb);
    this.set(saved)._imageHash = hash;
    return this;
  }

  // A YouTube video added by its URL alone gets the player YouTube's API
  // would have handed the scraper, so it plays wherever the stored html is read.
  fillEmbed(): this {
    if (Number(this.type) === mediumID.youtube && !this.html) {
      const other = videoSource(this.originalUrl)?.provider !== 'youtube';
      this.html = (other ? videoPlayerHtml({ originalUrl: this.originalUrl }) : youtubeEmbedHtml(this.originalUrl)) ?? this.html;
    }
    return this;
  }

  // Stores the video's largest still on the CDN as this medium's thumb. The
  // medium keeps its embed originalUrl, which is how pin updates match media.
  async addVideoThumb(): Promise<this> {
    const source = videoSource(this.originalUrl);
    if (source && source.provider !== 'youtube') {
      // Dailymotion's API names its largest still (its fixed address is a small one); Vimeo's is in its oEmbed.
      if (source.provider === 'twitch') {
        const clip = await getClip(source.id);
        if (!clip) throw new Error(`Twitch clip ${source.id} not found`);
        // Helix's thumbnail is a 480x272 preview.
        const { thumbName, thumbWidth, thumbHeight } = await mapAndSaveThumb(await image.createThumbFromUrl(clip.thumbnail_url));
        return Object.assign(this, { thumbName, thumbWidth, thumbHeight });
      }
      const get = async (url: string) => (await fetch(url, { signal: AbortSignal.timeout(10000) })).json();
      const still: string =
        source.provider === 'dailymotion'
          ? ((await get(`https://api.dailymotion.com/video/${encodeURIComponent(source.id)}?fields=thumbnail_720_url`).catch(() => undefined))?.thumbnail_720_url ??
            `https://www.dailymotion.com/thumbnail/video/${encodeURIComponent(source.id)}`)
          : (await get(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${source.id}`)}&width=1280`)).thumbnail_url;
      const { thumbName, thumbWidth, thumbHeight } = await mapAndSaveThumb(await image.createThumbFromUrl(still));
      return Object.assign(this, { thumbName, thumbWidth, thumbHeight });
    }
    const { id } = getVideoId(this.originalUrl?.replace(/^\/\//, 'https://') || '');
    if (!id) {
      throw new Error(`No YouTube video id in ${this.originalUrl}`);
    }
    let lastErr: unknown;
    // maxresdefault is missing for older and low-resolution uploads; hqdefault always exists.
    for (const size of ['maxresdefault', 'sddefault', 'hqdefault']) {
      try {
        const { thumbName, thumbWidth, thumbHeight } = await mapAndSaveThumb(
          await image.createThumbFromUrl(`https://i.ytimg.com/vi/${id}/${size}.jpg`),
        );
        return Object.assign(this, { thumbName, thumbWidth, thumbHeight });
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }

  deleteFromPin(query: QueryFn = db.query) {
    return deleteFromPin(this, this._pin!.id, query);
  }

  setPin(pin: BasePin): this {
    this._pin = pin;
    return this;
  }

  // Full weight is every medium's own, so it is left out: the seeds and the
  // API only carry the weight of a demoted one.
  toJSON(): Row {
    return _.omitBy(this, (value, key) => key.startsWith('_') || _.isNull(value) || (key === 'weight' && Number(value) === FULL_WEIGHT));
  }

  static async getByOriginalUrl(originalUrl: string) {
    const rows = await db.query(
      `
    SELECT "id", ${MEDIUM_COLUMNS.map((c) => `"${c}"`).join(', ')}
    FROM "Medium"
    WHERE "originalUrl" = $1`,
      [originalUrl],
    );
    return { medium: rows.length ? new Medium(rows[0]) : undefined };
  }

  static createAndSaveToCDN(originalUrl: string) {
    return new Medium({ originalUrl }).createAndSaveToCDN();
  }

  // Makes a thumb from an uploaded file (its bytes) and stores it on the CDN.
  // No Medium row is written; the editor only needs the URL.
  static async createAndSaveToCDNFromBuffer(buffer: Buffer) {
    return mapAndSaveThumb(await image.createThumbFromBuffer(buffer));
  }
}

export const FULL_WEIGHT = 1;

const weightOf = (medium: Row) => (medium.weight == null ? FULL_WEIGHT : Number(medium.weight));

// The order a pin shows its media in: heaviest first, then the order they
// were added in, so a demoted picture stops leading the pin.
export function byWeight<T extends Row>(media: T[]): T[] {
  return _.sortBy(media, (m) => -weightOf(m), (m) => Number(m.id) || 0);
}

// Sets how much a medium counts on its pin.
export async function setWeight(pinId: number, mediumId: number, weight: number) {
  await db.query(`UPDATE "PinMedium" SET "weight" = $3 WHERE "pinId" = $1 AND "mediumId" = $2`, [pinId, mediumId, Math.min(Math.max(weight, 0), FULL_WEIGHT)]);
}

// Takes a medium off its pin but keeps the row: the dropped picture's
// fingerprint is how a later search (a suggestion's, media:top-up) knows not
// to add it back. Removing one by hand (deleteFromPin) forgets it instead.
export async function dropFromPin(pinId: number, mediumId: number) {
  await db.query(`UPDATE "PinMedium" SET "utcDeletedDateTime" = now() WHERE "pinId" = $1 AND "mediumId" = $2 AND "utcDeletedDateTime" IS NULL`, [pinId, mediumId]);
}

// The media dropped from a pin, for leaving them out of what is added to it.
export async function droppedMedia(pinId: number): Promise<Medium[]> {
  const rows = await db.query(
    `SELECT "m".* FROM "PinMedium" AS "pm" JOIN "Medium" AS "m" ON "m"."id" = "pm"."mediumId"
     WHERE "pm"."pinId" = $1 AND "pm"."utcDeletedDateTime" IS NOT NULL`,
    [pinId],
  );
  return rows.map((row) => new Medium(row));
}

// Every medium of one pin, created and linked in one statement rather than
// one apiece. Same two inserts as createPinMediumLink, fed from arrays; the
// rows go in ordinal order so the ids ascend with the list, and sorting what
// comes back by id restores that order. Only for media that already have
// their thumb - addThumb fetches and uploads one per medium, which is where a
// new pin's time actually goes.
export async function saveAllToPin(media: Medium[], pinId: number, query: QueryFn = db.query): Promise<Medium[]> {
  if (!media.length) {
    return media;
  }
  const n = MEDIUM_COLUMNS.length;
  const columns = MEDIUM_COLUMNS.map((c) => `"${c}"`).join(', ');
  const types = ['varchar', 'integer', 'integer', 'varchar', 'integer', 'integer', 'varchar', 'varchar', 'varchar', 'varchar'];
  const rows = await query<{ id: number }>(
    `
    WITH "input" AS (
      SELECT * FROM unnest(${types.map((t, i) => `$${i + 1}::${t}[]`).join(', ')})
        WITH ORDINALITY AS "m" (${columns}, "ord")
    ), "medium" AS (
      INSERT INTO "Medium" (${columns})
      SELECT ${columns} FROM "input" ORDER BY "ord"
      RETURNING "id"
    ), "link" AS (
      INSERT INTO "PinMedium" ("pinId", "mediumId", "utcCreatedDateTime", "utcDeletedDateTime", "weight")
      SELECT $${n + 1}, "medium"."id", $${n + 2}, $${n + 3}, "w"."weight"
      FROM (SELECT "id", row_number() OVER (ORDER BY "id") AS "ord" FROM "medium") AS "medium"
        JOIN unnest($${n + 4}::real[]) WITH ORDINALITY AS "w" ("weight", "ord") ON "w"."ord" = "medium"."ord"
    )
    SELECT "id" FROM "medium"`,
    [
      ...MEDIUM_COLUMNS.map((c) => media.map((m) => ((m as Row)[c] === undefined ? null : (m as Row)[c]))),
      pinId,
      media[0].utcCreatedDateTime || new Date(),
      media[0].utcDeletedDateTime === undefined ? null : media[0].utcDeletedDateTime,
      media.map(weightOf),
    ],
  );
  rows.sort((a, b) => a.id - b.id);
  media.forEach((medium, i) => {
    medium.id = rows[i].id;
  });
  return media;
}

// The fingerprint of a medium's picture: the one taken when its thumb was
// made, else a reading of the thumb on the CDN, else of the original it came
// from (production has no thumbs, and an old original can be gone from its
// host). A medium that is not a picture, or whose picture cannot be read, has
// none, and callers treat that as "cannot tell".
export async function imageHashOf(medium: Medium): Promise<string | undefined> {
  if (medium._imageHash || Number(medium.type) !== mediumID.image) {
    return medium._imageHash;
  }
  const thumb = medium.thumbName ? await image.hashImageAtUrl(azureBlob.getBlobUrl(medium.thumbName)) : undefined;
  medium._imageHash = thumb ?? (medium.originalUrl ? await image.hashImageAtUrl(medium.originalUrl) : undefined);
  return medium._imageHash;
}

// The pictures worth adding out of adding, given the media the pin has: a
// picture that is the one a pin already carries adds nothing to it, however
// different its URL. It happens by the dozen - a poster from the page and the
// same poster from the catalogue's CDN at another size, an article's og:image
// that is the lead photo the page itself showed - and it costs the pin one of
// the three slots it has for saying something new.
//
// Only pictures are weighed, and only against the pin's other pictures:
// videos and media whose picture will not read are all kept.
export async function withoutRepeatedPictures(
  adding: Medium[],
  existing: Medium[],
): Promise<{ keep: Medium[]; dropped: { medium: Medium; like: Medium }[] }> {
  const pictures = adding.filter((m) => Number(m.type) === mediumID.image);
  if (!pictures.length) {
    return { keep: adding, dropped: [] };
  }
  const kept = [...existing.filter((m) => Number(m.type) === mediumID.image)];
  const dropped: { medium: Medium; like: Medium }[] = [];
  for (const medium of pictures) {
    const hash = await imageHashOf(medium);
    const like = hash && (await firstNearDuplicate(hash, kept));
    if (like) {
      dropped.push({ medium, like });
      log.info(`skipping ${medium.originalUrl}: the same picture as ${like.originalUrl}`);
    } else {
      kept.push(medium);
    }
  }
  return { keep: adding.filter((m) => !dropped.some((d) => d.medium === m)), dropped };
}

async function firstNearDuplicate(hash: string, media: Medium[]): Promise<Medium | undefined> {
  for (const other of media) {
    if (isNearDuplicate(hash, await imageHashOf(other))) {
      return other;
    }
  }
  return undefined;
}

const MEDIUM_COLUMNS = [
  'thumbName', 'thumbWidth', 'thumbHeight', 'originalUrl', 'originalWidth',
  'originalHeight', 'type', 'authorName', 'authorUrl', 'html',
];

function mediumValues(medium: Row) {
  return MEDIUM_COLUMNS.map((c) => (medium[c] === undefined ? null : medium[c]));
}

const MEDIUM_INSERT = `
  INSERT INTO "Medium" (${MEDIUM_COLUMNS.map((c) => `"${c}"`).join(', ')})
  VALUES (${MEDIUM_COLUMNS.map((_c, i) => `$${i + 1}`).join(', ')})
  RETURNING "id"`;

// Creates the medium and links it to the pin in one statement, so a medium is
// never left without its link.
async function createPinMediumLink<T extends Medium>(medium: T, pinId: number): Promise<T> {
  const values = mediumValues(medium).concat([
    pinId,
    medium.utcCreatedDateTime || new Date(),
    medium.utcDeletedDateTime === undefined ? null : medium.utcDeletedDateTime,
    weightOf(medium),
  ]);
  const n = MEDIUM_COLUMNS.length;
  const rows = await db.query(
    `
    WITH "medium" AS (${MEDIUM_INSERT}),
    "link" AS (
      INSERT INTO "PinMedium" ("pinId", "mediumId", "utcCreatedDateTime", "utcDeletedDateTime", "weight")
      SELECT $${n + 1}, "medium"."id", $${n + 2}, $${n + 3}, $${n + 4} FROM "medium"
    )
    SELECT "id" FROM "medium"`,
    values,
  );
  medium.id = rows[0].id;
  return medium;
}

async function createMedium<T extends Medium>(medium: T): Promise<T> {
  const rows = await db.query(MEDIUM_INSERT, mediumValues(medium));
  medium.id = rows[0].id;
  return medium;
}

export type ThumbMeta = Awaited<ReturnType<typeof image.createThumbFromUrl>>;

function mapAndSaveThumb(thumb: ThumbMeta) {
  return image.saveThumb({
    buffer: thumb.buffer,
    hash: thumb.hash,
    thumbName: randomUUID() + thumb.extension,
    thumbWidth: thumb.thumbWidth,
    thumbHeight: thumb.thumbHeight,
    originalUrl: thumb.originalUrl,
    originalWidth: thumb.originalWidth,
    originalHeight: thumb.originalHeight,
    mimeType: thumb.type,
    type: 1, // Image
  });
}

async function getImageStatAndSaveImage(imageUrl: string) {
  const saved = await mapAndSaveThumb(await image.createThumbFromUrl(imageUrl));
  // The buffer and mime type are only needed for the upload; the hash is the
  // medium's own, under the name the class keeps it by.
  const { buffer: _buffer, mimeType: _mimeType, hash, ...medium } = saved;
  return { ...medium, _imageHash: hash };
}

// Removes the link and the medium row itself (not the file on the CDN), in
// one statement so neither is left without the other.
async function deleteFromPin(medium: Medium, pinId: number, query: QueryFn) {
  const utcDeletedDateTime = new Date();
  await query(
    `WITH "link" AS (DELETE FROM "PinMedium" WHERE "pinId" = $1 AND "mediumId" = $2)
     DELETE FROM "Medium" WHERE "id" = $2`,
    [pinId, medium.id],
  );
  return { utcDeletedDateTime, medium };
}
