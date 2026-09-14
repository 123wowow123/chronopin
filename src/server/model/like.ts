import * as db from '../db';
import type { Row } from '../db';
import PinUserLink from './pinUserLink';

const prop = ['id', 'like', 'utcCreatedDateTime', 'utcUpdatedDateTime'];

export default class Like extends PinUserLink {
  protected get props() {
    return prop;
  }

  async save() {
    try {
      return await upsert(this);
    } catch (err) {
      console.log(`Like '${this.id}' save err:`, err);
      throw err;
    }
  }

  update() {
    return this.save();
  }

  // Soft deletes.
  async delete() {
    const rows = await db.query(
      `UPDATE "Like" SET "utcDeletedDateTime" = now() WHERE "id" = $1 RETURNING "utcDeletedDateTime"`,
      [this.id],
    );
    return deleted(this, rows);
  }

  async deleteByPinId() {
    const rows = await db.query(
      `UPDATE "Like" SET "utcDeletedDateTime" = now() WHERE "pinId" = $1 AND "userId" = $2 RETURNING "utcDeletedDateTime"`,
      [this.pinId, this.userId],
    );
    return deleted(this, rows);
  }

  static async queryById(id: number) {
    const rows = await db.query(`SELECT "id", "like", "userId", "pinId", "utcCreatedDateTime" FROM "Like" WHERE "id" = $1`, [id]);
    return { like: rows.length ? new Like(rows[0]) : undefined };
  }
}

// Saving the same user and pin again revives the existing row rather than
// adding a second one.
async function upsert(like: Like) {
  const values = [
    like.like,
    like.userId,
    like.pinId,
    like.utcCreatedDateTime || new Date(),
    like.utcUpdatedDateTime,
    like.utcDeletedDateTime,
  ].map((value) => (value === undefined ? null : value));
  const rows = await db.query(
    `
    INSERT INTO "Like" ("like", "userId", "pinId", "utcCreatedDateTime", "utcUpdatedDateTime", "utcDeletedDateTime")
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT ("userId", "pinId") DO UPDATE SET
        "like" = EXCLUDED."like",
        "utcUpdatedDateTime" = now(),
        "utcDeletedDateTime" = NULL
    RETURNING "id"`,
    values,
  );
  like.id = rows[0].id;
  return { like };
}

function deleted(like: Like, rows: Row[]) {
  const utcDeletedDateTime = rows.length ? rows[0].utcDeletedDateTime : undefined;
  like.utcDeletedDateTime = utcDeletedDateTime;
  return { utcDeletedDateTime, like };
}
