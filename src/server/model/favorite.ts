import * as db from '../db';
import type { Row } from '../db';
import PinUserLink from './pinUserLink';

const prop = ['id', 'utcCreatedDateTime', 'utcUpdatedDateTime'];

// A user watching a pin.
export default class Favorite extends PinUserLink {
  protected get props() {
    return prop;
  }

  async save() {
    try {
      return await upsert(this);
    } catch (err) {
      console.log(`Favorite '${this.id}' save err:`, err);
      throw err;
    }
  }

  update() {
    return this.save();
  }

  // Soft deletes.
  async delete() {
    const rows = await db.query(
      `UPDATE "Favorite" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
      [this.id],
    );
    return deleted(this, rows);
  }

  async deleteByPinId() {
    const rows = await db.query(
      `UPDATE "Favorite" SET "utcDeletedDateTime" = now() WHERE "pinId" = $1 AND "userId" = $2 RETURNING "utcDeletedDateTime"`,
      [this.pinId, this.userId],
    );
    return deleted(this, rows);
  }

  static async queryById(id: number) {
    const rows = await db.query(`SELECT "id", "userId", "pinId", "utcCreatedDateTime" FROM "Favorite" WHERE "id" = $1`, [id]);
    return { favorite: rows.length ? new Favorite(rows[0]) : undefined };
  }

  // Changes whenever this user watches or unwatches anything: how many pins
  // they watch, and when the latest watch or unwatch happened.
  static async listVersion(userId: number): Promise<string> {
    const rows = await db.query<{ count: number; changed: Date | null }>(
      `SELECT count(*) FILTER (WHERE "utcDeletedDateTime" IS NULL)::integer AS "count",
              max(GREATEST("utcCreatedDateTime", "utcUpdatedDateTime", "utcDeletedDateTime")) AS "changed"
       FROM "Favorite" WHERE "userId" = $1`,
      [userId],
    );
    return `${rows[0].count}:${rows[0].changed ? new Date(rows[0].changed).getTime() : 0}`;
  }

  // Which of these pins this user watches. Answers the whole of a page at
  // once, so a page of cards can be cached with no viewer in it.
  static async watchedAmong(userId: number, pinIds: number[]): Promise<number[]> {
    if (!pinIds.length) {
      return [];
    }
    const rows = await db.query<{ pinId: number }>(
      `SELECT "pinId" FROM "Favorite"
       WHERE "userId" = $1 AND "pinId" = ANY($2::integer[]) AND "utcDeletedDateTime" IS NULL`,
      [userId, pinIds],
    );
    return rows.map((row) => row.pinId);
  }
}

// Saving the same user and pin again revives the existing row rather than
// adding a second one.
async function upsert(favorite: Favorite) {
  const values = [
    favorite.userId,
    favorite.pinId,
    favorite.utcCreatedDateTime || new Date(),
    favorite.utcUpdatedDateTime,
    favorite.utcDeletedDateTime,
  ].map((value) => (value === undefined ? null : value));
  const rows = await db.query(
    `
    INSERT INTO "Favorite" ("userId", "pinId", "utcCreatedDateTime", "utcUpdatedDateTime", "utcDeletedDateTime")
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT ("userId", "pinId") DO UPDATE SET
        "utcUpdatedDateTime" = now(),
        "utcDeletedDateTime" = NULL
    RETURNING "id"`,
    values,
  );
  favorite.id = rows[0].id;
  return { favorite };
}

function deleted(favorite: Favorite, rows: Row[]) {
  const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
  favorite.utcDeletedDateTime = utcDeletedDateTime;
  return { utcDeletedDateTime, favorite };
}
