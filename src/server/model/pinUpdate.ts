import * as db from '../db';
import type { QueryFn, Row } from '../db';
import type { PinChange, PinUpdateJson, PinUpdateKind, PinUpdateReference } from '@/lib/pinUpdates';

// What changed on a pin after it was posted, and why (0081). Written by
// services/pinUpdates.ts; read by the pin page's Updates pane.
export type NewPinUpdate = {
  pinId: number;
  kind: PinUpdateKind;
  userId?: number | null;
  relatedPinId?: number | null;
  changes: PinChange[];
  references: PinUpdateReference[];
  note?: string | null;
};

export const NOTE_MAX = 1000;

export default class PinUpdate {
  static async create(update: NewPinUpdate, query: QueryFn = db.query): Promise<number> {
    const [row] = await query<{ id: number }>(
      `INSERT INTO "PinUpdate" ("pinId", "kind", "userId", "relatedPinId", "changes", "references", "note")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7) RETURNING "id"`,
      [
        update.pinId,
        update.kind,
        update.userId ?? null,
        update.relatedPinId ?? null,
        JSON.stringify(update.changes),
        JSON.stringify(update.references),
        update.note?.slice(0, NOTE_MAX) || null,
      ],
    );
    return row.id;
  }

  // The pin's newest update since `since`, which a rewrite that follows it
  // (the article rebuilt from the link it brought) folds into.
  static async latestSince(pinId: number, since: Date): Promise<(Row & { id: number; kind: PinUpdateKind; changes: PinChange[]; note: string | null }) | undefined> {
    const [row] = await db.query(
      `SELECT "id", "kind", "changes", "note" FROM "PinUpdate"
       WHERE "pinId" = $1 AND "utcCreatedDateTime" >= $2
       ORDER BY "utcCreatedDateTime" DESC, "id" DESC LIMIT 1`,
      [pinId, since],
    );
    return row as never;
  }

  static async amend(id: number, changes: PinChange[], note: string | null | undefined) {
    await db.query(`UPDATE "PinUpdate" SET "changes" = $2::jsonb, "note" = COALESCE($3, "note") WHERE "id" = $1`, [
      id,
      JSON.stringify(changes),
      note?.slice(0, NOTE_MAX) || null,
    ]);
  }

  // A pin's updates, newest first, with who brought each and the newer pin a
  // duplicate update came from (while it is live).
  static async forPin(pinId: number, limit = 50): Promise<PinUpdateJson[]> {
    const rows = await db.query(
      `SELECT u."id", u."pinId", u."kind", u."changes", u."references", u."note", u."utcCreatedDateTime",
         u."userId", "User"."userName", "User"."pictureUrl",
         r."id" AS "relatedId", r."title" AS "relatedTitle", r."utcCreatedDateTime" AS "relatedCreated", ru."userName" AS "relatedUserName"
       FROM "PinUpdate" u
         LEFT JOIN "User" ON "User"."id" = u."userId"
         LEFT JOIN "Pin" r ON r."id" = u."relatedPinId" AND r."utcDeletedDateTime" IS NULL
         LEFT JOIN "User" ru ON ru."id" = r."userId"
       WHERE u."pinId" = $1
       ORDER BY u."utcCreatedDateTime" DESC, u."id" DESC
       LIMIT $2`,
      [pinId, limit],
    );
    return rows.map((row) => ({
      id: row.id,
      pinId: row.pinId,
      kind: row.kind,
      changes: row.changes ?? [],
      references: row.references ?? [],
      note: row.note,
      utcCreatedDateTime: new Date(row.utcCreatedDateTime).toISOString(),
      user: row.userName ? { id: row.userId, userName: row.userName, pictureUrl: row.pictureUrl ?? null } : null,
      relatedPin: row.relatedId
        ? {
            id: row.relatedId,
            title: row.relatedTitle,
            utcCreatedDateTime: new Date(row.relatedCreated).toISOString(),
            user: row.relatedUserName ? { userName: row.relatedUserName } : null,
          }
        : null,
    }));
  }

  // Whether the newer pin's source already came into this one.
  static async hasDuplicateFeed(pinId: number, relatedPinId: number): Promise<boolean> {
    const rows = await db.query(`SELECT 1 FROM "PinUpdate" WHERE "pinId" = $1 AND "relatedPinId" = $2 AND "kind" = 'duplicate' LIMIT 1`, [
      pinId,
      relatedPinId,
    ]);
    return rows.length > 0;
  }

  // For backups (scripts/data).
  static getAll(): Promise<Row[]> {
    return db.query(
      `SELECT "id", "pinId", "kind", "userId", "relatedPinId", "changes", "references", "note", "utcCreatedDateTime"
       FROM "PinUpdate" ORDER BY "id"`,
    );
  }

  static async restore(rows: Row[] | undefined) {
    for (const row of rows || []) {
      await db.query(
        `INSERT INTO "PinUpdate" ("id", "pinId", "kind", "userId", "relatedPinId", "changes", "references", "note", "utcCreatedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
         ON CONFLICT ("id") DO NOTHING`,
        [row.id, row.pinId, row.kind, row.userId ?? null, row.relatedPinId ?? null, JSON.stringify(row.changes ?? []), JSON.stringify(row.references ?? []), row.note ?? null, row.utcCreatedDateTime],
      );
    }
    // Ids were given, so the sequence moves past them.
    await db.query(`SELECT setval(pg_get_serial_sequence('"PinUpdate"', 'id'), GREATEST((SELECT max("id") FROM "PinUpdate"), 1))`);
  }
}
