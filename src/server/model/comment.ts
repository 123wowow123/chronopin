import _ from 'lodash';
import * as db from '../db';
import type { Row } from '../db';
import { advanceIdSequence } from './pinShared';
import PinUserLink from './pinUserLink';
import User from './user';

const prop = ['id', 'text', 'parentCommentId', 'utcCreatedDateTime', 'utcUpdatedDateTime'];

// How long after posting a comment its author may still edit it.
export const EDIT_WINDOW_MINUTES = 5;

const COMMENT_COLUMNS = `"id", "text", "userId", "pinId", "parentCommentId", "utcCreatedDateTime", "utcUpdatedDateTime"`;

export default class Comment extends PinUserLink {
  declare text: string;
  declare parentCommentId: number | null;

  protected get props() {
    return prop;
  }

  protected afterUserId(row: Row) {
    if (row['User.userName']) {
      this._user!.userName = row['User.userName'];
    }
    if (row['User.pictureUrl']) {
      this._user!.pictureUrl = row['User.pictureUrl'];
    }
  }

  // A comment that already has an id (restoring a backup) keeps it, so
  // parentCommentId chains still resolve after a reseed.
  async save() {
    try {
      const hasId = this.id != null;
      const columns = ['text', 'userId', 'pinId', 'parentCommentId', 'utcCreatedDateTime', 'utcUpdatedDateTime'];
      const values = [
        this.text,
        this.userId,
        this.pinId,
        this.parentCommentId,
        this.utcCreatedDateTime || new Date(),
        this.utcUpdatedDateTime,
      ].map((value) => (value === undefined ? null : value));
      if (hasId) {
        columns.unshift('id');
        values.unshift(this.id);
      }
      const rows = await db.query(
        `
        INSERT INTO "Comment" (${columns.map((c) => `"${c}"`).join(', ')})
        VALUES (${values.map((_v, i) => `$${i + 1}`).join(', ')})
        RETURNING "id", "utcCreatedDateTime"`,
        values,
      );
      this.id = rows[0].id;
      // The client times its edit window from this.
      this.utcCreatedDateTime = rows[0].utcCreatedDateTime;
      if (hasId) {
        await advanceIdSequence('Comment');
      }
      return { comment: this };
    } catch (err) {
      console.log(`Comment '${this.id}' save err:`, err);
      throw err;
    }
  }

  // Only the author, only while the comment is live, and only within the edit
  // window. updated is false when any of those fail.
  async update() {
    const rows = await db.query(
      `
      UPDATE "Comment"
      SET "text" = $3, "utcUpdatedDateTime" = now()
      WHERE "id" = $1
        AND "userId" = $2
        AND "utcDeletedDateTime" IS NULL
        AND "utcCreatedDateTime" >= now() - make_interval(mins => $4)
      RETURNING "utcUpdatedDateTime"`,
      [this.id, this.userId, this.text, EDIT_WINDOW_MINUTES],
    );
    const updated = rows.length > 0;
    if (updated) {
      this.utcUpdatedDateTime = rows[0].utcUpdatedDateTime;
    }
    return { comment: this, updated };
  }

  // A soft delete, by the author only.
  async delete() {
    const utcDeletedDateTime = new Date();
    await db.query(`UPDATE "Comment" SET "utcDeletedDateTime" = $3 WHERE "id" = $1 AND "userId" = $2`, [
      this.id,
      this.userId,
      utcDeletedDateTime,
    ]);
    this.utcDeletedDateTime = utcDeletedDateTime;
    return { utcDeletedDateTime, comment: this };
  }

  toJSON(): Row {
    const json = super.toJSON();
    json.userName = _.get(this, '_user.userName');
    json.userPictureUrl = _.get(this, '_user.pictureUrl') || undefined;
    return json;
  }

  static async queryById(id: number) {
    const rows = await db.query(`SELECT ${COMMENT_COLUMNS} FROM "Comment" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [id]);
    return { comment: rows.length ? new Comment(rows[0]) : undefined };
  }

  static delete(id: number, userId: number) {
    return new Comment({ id }, new User({ id: userId })).delete();
  }

  static async getByPinId(pinId: number): Promise<Comment[]> {
    const rows = await db.query(
      `
    SELECT "Comment"."id", "Comment"."text", "Comment"."userId", "Comment"."pinId",
           "Comment"."parentCommentId", "Comment"."utcCreatedDateTime", "Comment"."utcUpdatedDateTime",
           "User"."userName" AS "User.userName", "User"."pictureUrl" AS "User.pictureUrl"
    FROM "Comment"
      LEFT JOIN "User" ON "Comment"."userId" = "User"."id"
    WHERE "Comment"."pinId" = $1 AND "Comment"."utcDeletedDateTime" IS NULL
    ORDER BY "Comment"."utcCreatedDateTime" ASC, "Comment"."id" ASC`,
      [pinId],
    );
    return rows.map((row) => new Comment(row));
  }

  // Every live comment, oldest first, so a parent always comes before its
  // replies: seeding can walk this list once.
  static async getAll(): Promise<Comment[]> {
    const rows = await db.query(`
    SELECT ${COMMENT_COLUMNS}
    FROM "Comment"
    WHERE "utcDeletedDateTime" IS NULL
    ORDER BY "utcCreatedDateTime" ASC, "id" ASC`);
    return rows.map((row) => new Comment(row));
  }

  // Re-inserts backed-up comments with their ids, one after another so a
  // parent always lands before a reply that references it.
  static async restoreAll(comments: Row[]) {
    for (const c of comments) {
      await new Comment(c).save();
    }
  }
}
