import _ from 'lodash';
import * as db from '../db';
import type { QueryFn, Row } from '../db';
import Notification from './notification';
import { advanceIdSequence } from './pinShared';
import PinUserLink from './pinUserLink';
import User from './user';

const prop = ['id', 'text', 'parentCommentId', 'sentiment', 'utcCreatedDateTime', 'utcUpdatedDateTime'];

// How long after posting a comment its author may still edit it.
export const EDIT_WINDOW_MINUTES = 5;

const COMMENT_COLUMNS = `"id", "text", "userId", "pinId", "parentCommentId", "sentiment", "utcCreatedDateTime", "utcUpdatedDateTime"`;

export default class Comment extends PinUserLink {
  declare text: string;
  declare parentCommentId: number | null;
  // -1..1, null until Claude has scored it (src/server/extract/sentiment.ts).
  declare sentiment: number | null;

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
  // parentCommentId chains still resolve after a reseed. Saving sends no
  // notifications; post() does.
  async save(query: QueryFn = db.query) {
    try {
      const hasId = this.id != null;
      const columns = ['text', 'userId', 'pinId', 'parentCommentId', 'sentiment', 'utcCreatedDateTime', 'utcUpdatedDateTime'];
      const values = [
        this.text,
        this.userId,
        this.pinId,
        this.parentCommentId,
        this.sentiment,
        this.utcCreatedDateTime || new Date(),
        this.utcUpdatedDateTime,
      ].map((value) => (value === undefined ? null : value));
      if (hasId) {
        columns.unshift('id');
        values.unshift(this.id);
      }
      const rows = await query(
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

  // A new comment from the site: saves it and, in the same transaction, tells
  // the author of the comment it replies to ('reply') and the pin's author
  // ('comment'). Nobody hears about their own comment, and someone who is both
  // gets only the reply. Resolves { comment: undefined } when the pin is gone.
  async post(parent?: Comment) {
    return db.transaction(async (query) => {
      const pins = await query<{ userId: number | null }>(
        `SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
        [this.pinId],
      );
      if (!pins.length) {
        return { comment: undefined };
      }
      await this.save(query);

      const actorId = Number(this.userId);
      const notify = { actorId, pinId: this.pinId, commentId: this.id };
      const parentAuthorId = parent?.userId == null ? null : Number(parent.userId);
      if (parentAuthorId != null && parentAuthorId !== actorId) {
        await Notification.create({ ...notify, userId: parentAuthorId, type: Notification.types.reply }, query);
      }
      const pinAuthorId = pins[0].userId == null ? null : Number(pins[0].userId);
      if (pinAuthorId != null && pinAuthorId !== actorId && pinAuthorId !== parentAuthorId) {
        await Notification.create({ ...notify, userId: pinAuthorId, type: Notification.types.comment }, query);
      }
      return { comment: this };
    });
  }

  // Only the author, only while the comment is live, and only within the edit
  // window. updated is false when any of those fail. The new text has not been
  // scored yet, so its sentiment goes back to null.
  async update() {
    const rows = await db.query(
      `
      UPDATE "Comment"
      SET "text" = $3, "sentiment" = NULL, "utcUpdatedDateTime" = now()
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
      this.sentiment = null;
    }
    return { comment: this, updated };
  }

  // A soft delete, by the author only. It also takes back the notifications
  // the comment sent.
  async delete() {
    const utcDeletedDateTime = new Date();
    await db.transaction(async (query) => {
      const rows = await query(
        `UPDATE "Comment" SET "utcDeletedDateTime" = $3 WHERE "id" = $1 AND "userId" = $2 RETURNING "id"`,
        [this.id, this.userId, utcDeletedDateTime],
      );
      if (rows.length) {
        await Notification.retractForComment(this.id, query);
      }
    });
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
           "Comment"."parentCommentId", "Comment"."sentiment", "Comment"."utcCreatedDateTime", "Comment"."utcUpdatedDateTime",
           "User"."userName" AS "User.userName", "User"."pictureUrl" AS "User.pictureUrl"
    FROM "Comment"
      LEFT JOIN "User" ON "Comment"."userId" = "User"."id"
    WHERE "Comment"."pinId" = $1 AND "Comment"."utcDeletedDateTime" IS NULL
    ORDER BY "Comment"."utcCreatedDateTime" ASC, "Comment"."id" ASC`,
      [pinId],
    );
    return rows.map((row) => new Comment(row));
  }

  // The tone scores on a company's pins, newest first and at most `limit` of
  // them: what a company: search's mood is read from (src/lib/commentMood.ts).
  // Comments waiting on a score come too, so the panel can say how many of the
  // comments it speaks for.
  static forCompany(companyId: number, limit: number) {
    return db.query<{ sentiment: number | null; utcCreatedDateTime: Date }>(
      `
    SELECT "Comment"."sentiment", "Comment"."utcCreatedDateTime"
    FROM "Comment"
      JOIN "Pin" ON "Pin"."id" = "Comment"."pinId"
    WHERE "Pin"."companyId" = $1 AND "Pin"."utcDeletedDateTime" IS NULL AND "Comment"."utcDeletedDateTime" IS NULL
    ORDER BY "Comment"."utcCreatedDateTime" DESC, "Comment"."id" DESC
    LIMIT $2`,
      [companyId, limit],
    );
  }

  // What scoring a comment's tone reads: its text, the pin it is on, and for a
  // reply the comment it answers. Undefined when the comment is gone.
  static async sentimentContext(id: number) {
    const rows = await db.query<{ text: string; pinId: number; pinTitle: string; parentText: string | null }>(
      `
    SELECT "Comment"."text", "Comment"."pinId", "Pin"."title" AS "pinTitle", "Parent"."text" AS "parentText"
    FROM "Comment"
      JOIN "Pin" ON "Pin"."id" = "Comment"."pinId"
      LEFT JOIN "Comment" AS "Parent" ON "Parent"."id" = "Comment"."parentCommentId" AND "Parent"."utcDeletedDateTime" IS NULL
    WHERE "Comment"."id" = $1 AND "Comment"."utcDeletedDateTime" IS NULL`,
      [id],
    );
    return rows[0];
  }

  // Stores a score for the text it was worked out from: when the comment was
  // edited in the meantime, the score is for old words and is dropped
  // (resolves false).
  static async setSentiment(id: number, scoredText: string, sentiment: number) {
    const rows = await db.query(`UPDATE "Comment" SET "sentiment" = $2 WHERE "id" = $1 AND "text" = $3 RETURNING "id"`, [
      id,
      sentiment,
      scoredText,
    ]);
    return rows.length > 0;
  }

  // Live comments nobody has scored yet, oldest first (the backfill script).
  static async unscoredIds(limit: number): Promise<number[]> {
    const rows = await db.query<{ id: number }>(
      `SELECT "id" FROM "Comment" WHERE "sentiment" IS NULL AND "utcDeletedDateTime" IS NULL ORDER BY "utcCreatedDateTime" ASC, "id" ASC LIMIT $1`,
      [limit],
    );
    return rows.map((row) => row.id);
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
