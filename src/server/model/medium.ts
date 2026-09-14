import { randomUUID } from 'node:crypto';
import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import * as image from '../image';
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
  // For twitter and youtube
  'authorName',
  'authorUrl',
  'html',
];

export default class Medium {
  [key: string]: any;
  declare _pin?: BasePin;
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
    const pinId = this._pin?.id;
    return pinId ? createPinMediumLink(this, pinId) : createMedium(this);
  }

  async createAndSaveToCDN(): Promise<this> {
    const newMedium = await getImageStatAndSaveImage(this.originalUrl);
    return this.set(newMedium).save();
  }

  deleteFromPin() {
    return deleteFromPin(this, this._pin!.id);
  }

  setPin(pin: BasePin): this {
    this._pin = pin;
    return this;
  }

  toJSON(): Row {
    return _.omitBy(this, (value, key) => key.startsWith('_') || _.isNull(value));
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
  ]);
  const n = MEDIUM_COLUMNS.length;
  const rows = await db.query(
    `
    WITH "medium" AS (${MEDIUM_INSERT}),
    "link" AS (
      INSERT INTO "PinMedium" ("pinId", "mediumId", "utcCreatedDateTime", "utcDeletedDateTime")
      SELECT $${n + 1}, "medium"."id", $${n + 2}, $${n + 3} FROM "medium"
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

type ThumbMeta = Awaited<ReturnType<typeof image.createThumbFromUrl>>;

function mapAndSaveThumb(thumb: ThumbMeta) {
  return image.saveThumb({
    buffer: thumb.buffer,
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
  // The buffer and mime type are only needed for the upload.
  const { buffer: _buffer, mimeType: _mimeType, ...medium } = saved;
  return medium;
}

// Removes the link and the medium row itself (not the file on the CDN).
async function deleteFromPin(medium: Medium, pinId: number) {
  const utcDeletedDateTime = new Date();
  await db.transaction(async (query) => {
    await query(`DELETE FROM "PinMedium" WHERE "pinId" = $1 AND "mediumId" = $2`, [pinId, medium.id]);
    await query(`DELETE FROM "Medium" WHERE "id" = $1`, [medium.id]);
  });
  return { utcDeletedDateTime, medium };
}
