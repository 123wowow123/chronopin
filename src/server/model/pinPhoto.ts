import * as db from '../db';
import type { Row } from '../db';
import type { PhotoTag } from '@/lib/userReviews';

// Photos readers add to a pin from their own device (0171), apart from the
// pin's own media. Static queries, as PinNotInterested's are.

// Flags from this many different readers hide a photo until an admin looks.
export const PIN_PHOTO_HIDE_AT = 3;
export const PIN_PHOTO_CAPTION_MAX = 200;
export const PIN_PHOTO_FLAG_REASONS = ['wrong', 'inappropriate', 'spam', 'private', 'other'] as const;
export type PinPhotoFlagReason = (typeof PIN_PHOTO_FLAG_REASONS)[number];
// Uploads one reader may make in a day, so one account cannot flood a pin.
export const PIN_PHOTO_DAILY_LIMIT = 20;

export type PinPhotoJson = {
  id: number;
  pinId: number;
  blobName: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  // The reader's 1-5 rating of what the photo shows, and menu-item tags with their regions (0209).
  stars: number | null;
  tags: PhotoTag[];
  utcCreatedDateTime: string;
  userId: number;
  userName: string;
  mine: boolean;
  flagged: boolean;
  // Hidden after flags: only its owner is shown it, as under review.
  hidden: boolean;
  // How many visible photos this reader has added across the site.
  userPhotoCount: number;
  // Emoji reactions (0172): a count per kind, and the viewer's own.
  reactions: Record<string, number>;
  myReaction: string | null;
};

export type ReportedPhoto = {
  photoId: number;
  pinId: number;
  pinTitle: string;
  blobName: string;
  caption: string | null;
  authorName: string;
  utcCreatedDateTime: Date;
  flags: number;
  reasons: Record<string, number>;
  notes: string[];
  lastFlaggedDateTime: Date;
  hidden: boolean;
};

const SELECT = `
  SELECT "p"."id", "p"."pinId", "p"."blobName", "p"."width", "p"."height", "p"."caption", "p"."stars", "p"."tags",
         "p"."utcCreatedDateTime", "p"."userId", "u"."userName",
         ("p"."userId" = $2) AS "mine",
         EXISTS (SELECT 1 FROM "PinPhotoFlag" "f" WHERE "f"."photoId" = "p"."id" AND "f"."userId" = $2) AS "flagged",
         ("p"."status" = 'hidden') AS "hidden",
         (SELECT count(*)::integer FROM "PinPhoto" "o"
           WHERE "o"."userId" = "p"."userId" AND "o"."utcDeletedDateTime" IS NULL AND "o"."status" = 'visible') AS "userPhotoCount",
         COALESCE((SELECT json_object_agg("reaction", "n") FROM (
            SELECT "reaction", count(*)::integer AS "n" FROM "PinPhotoReaction" WHERE "photoId" = "p"."id" GROUP BY "reaction") AS "byKind"), '{}'::json) AS "reactions",
         (SELECT "reaction" FROM "PinPhotoReaction" WHERE "photoId" = "p"."id" AND "userId" = $2) AS "myReaction"
    FROM "PinPhoto" "p"
    JOIN "User" "u" ON "u"."id" = "p"."userId"`;

export default class PinPhoto {
  static problemWithCaption(caption: unknown): string | null {
    if (caption == null || caption === '') return null;
    if (typeof caption !== 'string') return 'caption must be text';
    if (caption.trim().length > PIN_PHOTO_CAPTION_MAX) return `caption can be up to ${PIN_PHOTO_CAPTION_MAX} characters`;
    return null;
  }

  // The visible photos on a pin, newest first. viewerId (or 0) fills `mine`
  // and `flagged`; a reader sees their own hidden photos too.
  static async forPin(pinId: number, viewerId = 0): Promise<PinPhotoJson[]> {
    return db.query<PinPhotoJson & Row>(
      `${SELECT}
        WHERE "p"."pinId" = $1 AND "p"."utcDeletedDateTime" IS NULL
          AND ("p"."status" = 'visible' OR "p"."userId" = $2)
        ORDER BY "p"."utcCreatedDateTime" DESC, "p"."id" DESC
        LIMIT 100`,
      [pinId, viewerId],
    );
  }

  static async countToday(userId: number): Promise<number> {
    const [row] = await db.query<{ n: string }>(
      `SELECT count(*) AS "n" FROM "PinPhoto" WHERE "userId" = $1 AND "utcCreatedDateTime" > now() - interval '1 day'`,
      [userId],
    );
    return Number(row.n);
  }

  static async create(input: { pinId: number; userId: number; blobName: string; width: number; height: number; caption?: string | null; stars?: number | null; tags?: PhotoTag[] }) {
    const [row] = await db.query<{ id: number }>(
      `INSERT INTO "PinPhoto" ("pinId", "userId", "blobName", "width", "height", "caption", "stars", "tags")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING "id"`,
      [input.pinId, input.userId, input.blobName, input.width, input.height, input.caption?.trim() || null, input.stars ?? null, JSON.stringify(input.tags ?? [])],
    );
    const [photo] = await db.query<PinPhotoJson & Row>(`${SELECT} WHERE "p"."id" = $1`, [row.id, input.userId]);
    return photo;
  }

  // Soft-deletes the photo when it is the reader's own (or they are an admin).
  // Resolves false when there was nothing of theirs to delete.
  static async remove(photoId: number, pinId: number, userId: number, isAdmin: boolean): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "PinPhoto" SET "utcDeletedDateTime" = now()
        WHERE "id" = $1 AND "pinId" = $2 AND "utcDeletedDateTime" IS NULL AND ("userId" = $3 OR $4)
        RETURNING "id"`,
      [photoId, pinId, userId, isAdmin],
    );
    return rows.length > 0;
  }

  // Records one reader's flag (a second from the same reader updates it) and
  // hides the photo once PIN_PHOTO_HIDE_AT different readers have flagged it.
  // Resolves null when there is no such live photo, or the reader's own.
  static async flag(photoId: number, pinId: number, userId: number, reason: PinPhotoFlagReason, note?: string | null) {
    const [photo] = await db.query<{ userId: number }>(
      `SELECT "userId" FROM "PinPhoto" WHERE "id" = $1 AND "pinId" = $2 AND "utcDeletedDateTime" IS NULL`,
      [photoId, pinId],
    );
    if (!photo || photo.userId === userId) return null;
    await db.query(
      `INSERT INTO "PinPhotoFlag" ("photoId", "userId", "reason", "note") VALUES ($1, $2, $3, $4)
       ON CONFLICT ("photoId", "userId") DO UPDATE SET "reason" = EXCLUDED."reason", "note" = EXCLUDED."note",
         "utcResolvedDateTime" = NULL`,
      [photoId, userId, reason, note?.trim().slice(0, 500) || null],
    );
    const [counted] = await db.query<{ n: string }>(
      `SELECT count(*) AS "n" FROM "PinPhotoFlag" WHERE "photoId" = $1 AND "utcResolvedDateTime" IS NULL`,
      [photoId],
    );
    const flags = Number(counted.n);
    let hidden = false;
    if (flags >= PIN_PHOTO_HIDE_AT) {
      await db.query(`UPDATE "PinPhoto" SET "status" = 'hidden' WHERE "id" = $1`, [photoId]);
      hidden = true;
    }
    return { flags, hidden };
  }

  // Sets the reader's reaction to a photo, or takes it back with null. Resolves
  // the photo's counts after it, or null when there is no such live photo.
  static async react(photoId: number, pinId: number, userId: number, reaction: string | null) {
    const [photo] = await db.query(
      `SELECT "id" FROM "PinPhoto" WHERE "id" = $1 AND "pinId" = $2 AND "utcDeletedDateTime" IS NULL AND "status" = 'visible'`,
      [photoId, pinId],
    );
    if (!photo) return null;
    if (reaction) {
      await db.query(
        `INSERT INTO "PinPhotoReaction" ("photoId", "userId", "reaction") VALUES ($1, $2, $3)
         ON CONFLICT ("photoId", "userId") DO UPDATE SET "reaction" = EXCLUDED."reaction"`,
        [photoId, userId, reaction],
      );
    } else {
      await db.query(`DELETE FROM "PinPhotoReaction" WHERE "photoId" = $1 AND "userId" = $2`, [photoId, userId]);
    }
    const [row] = await db.query<PinPhotoJson & Row>(`${SELECT} WHERE "p"."id" = $1`, [photoId, userId]);
    return { reactions: row.reactions, myReaction: row.myReaction };
  }

  // Photos with open flags, most flagged first, for the admin queue.
  static openReports() {
    return db.query<ReportedPhoto & Row>(`
      SELECT "p"."id" AS "photoId", "p"."pinId", "pin"."title" AS "pinTitle", "p"."blobName", "p"."caption",
             "u"."userName" AS "authorName", "p"."utcCreatedDateTime",
             COUNT(*)::integer AS "flags",
             (SELECT json_object_agg("reason", "n") FROM (
                SELECT "reason", COUNT(*)::integer AS "n" FROM "PinPhotoFlag"
                 WHERE "photoId" = "p"."id" AND "utcResolvedDateTime" IS NULL GROUP BY "reason") AS "byReason") AS "reasons",
             COALESCE(array_agg("f"."note") FILTER (WHERE "f"."note" IS NOT NULL), '{}') AS "notes",
             MAX("f"."utcCreatedDateTime") AS "lastFlaggedDateTime",
             ("p"."status" = 'hidden') AS "hidden"
        FROM "PinPhotoFlag" "f"
        JOIN "PinPhoto" "p" ON "p"."id" = "f"."photoId" AND "p"."utcDeletedDateTime" IS NULL
        JOIN "Pin" "pin" ON "pin"."id" = "p"."pinId"
        JOIN "User" "u" ON "u"."id" = "p"."userId"
       WHERE "f"."utcResolvedDateTime" IS NULL
       GROUP BY "p"."id", "pin"."title", "u"."userName"
       ORDER BY "hidden" DESC, "flags" DESC, "lastFlaggedDateTime" DESC
       LIMIT 200`);
  }

  // An admin looked and the photo stays: its flags are resolved and a hidden
  // photo shows on its pin again. Resolves the pin id, or null for no such photo.
  static async dismiss(photoId: number): Promise<number | null> {
    const [photo] = await db.query<{ pinId: number }>(
      `UPDATE "PinPhoto" SET "status" = 'visible' WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL RETURNING "pinId"`,
      [photoId],
    );
    if (!photo) return null;
    await db.query(`UPDATE "PinPhotoFlag" SET "utcResolvedDateTime" = now() WHERE "photoId" = $1 AND "utcResolvedDateTime" IS NULL`, [photoId]);
    return photo.pinId;
  }

  // Every photo, for backups (scripts/data).
  static getAll() {
    return db.query(`SELECT * FROM "PinPhoto" ORDER BY "id"`);
  }
}
