import _ from 'lodash';
import * as db from '../db';
import type { QueryFn, Row } from '../db';
import Notification from './notification';
import { advanceIdSequence } from './pinShared';
import PinUserLink from './pinUserLink';
import User from './user';
import type { CommentReactionName } from '@/lib/commentReactions';

const prop = ['id', 'text', 'parentCommentId', 'sentiment', 'reactions', 'myReaction', 'utcCreatedDateTime', 'utcUpdatedDateTime'];

export const COMMENT_REPORT_REASONS = ['spam', 'harassment', 'misleading', 'other'] as const;
export type CommentReportReason = (typeof COMMENT_REPORT_REASONS)[number];

const COMMENT_COLUMNS = `"id", "text", "userId", "pinId", "parentCommentId", "sentiment", "utcCreatedDateTime", "utcUpdatedDateTime"`;

export default class Comment extends PinUserLink {
  declare text: string;
  declare parentCommentId: number | null;
  // -1..1, null until Claude has scored it (src/server/extract/sentiment.ts).
  declare sentiment: number | null;
  // How many gave each reaction (0075), and the viewer's own or null. Read
  // with the pin's comments only.
  declare reactions: Partial<Record<CommentReactionName, number>> | undefined;
  declare myReaction: CommentReactionName | null | undefined;

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

  // A pin's live comments, oldest first, each with its reactions counted by
  // kind and the viewer's own (null when viewerId is null: signed out, or the
  // cached copy every reader shares).
  static async getByPinId(pinId: number, viewerId: number | null = null): Promise<Comment[]> {
    const rows = await db.query(
      `
    SELECT "Comment"."id", "Comment"."text", "Comment"."userId", "Comment"."pinId",
           "Comment"."parentCommentId", "Comment"."sentiment", "Comment"."utcCreatedDateTime", "Comment"."utcUpdatedDateTime",
           COALESCE("counts"."reactions", '{}'::json) AS "reactions",
           "mine"."reaction" AS "myReaction",
           "User"."userName" AS "User.userName", "User"."pictureUrl" AS "User.pictureUrl"
    FROM "Comment"
      LEFT JOIN "User" ON "Comment"."userId" = "User"."id"
      LEFT JOIN (
        SELECT "commentId", json_object_agg("reaction", "n") AS "reactions"
        FROM (SELECT "commentId", "reaction", COUNT(*)::integer AS "n" FROM "CommentReaction" GROUP BY "commentId", "reaction") AS "byKind"
        GROUP BY "commentId"
      ) AS "counts" ON "counts"."commentId" = "Comment"."id"
      LEFT JOIN "CommentReaction" AS "mine" ON "mine"."commentId" = "Comment"."id" AND "mine"."userId" = $2
    WHERE "Comment"."pinId" = $1 AND "Comment"."utcDeletedDateTime" IS NULL
    ORDER BY "Comment"."utcCreatedDateTime" ASC, "Comment"."id" ASC`,
      [pinId, viewerId],
    );
    return rows.map((row) => new Comment(row));
  }

  // Sets the viewer's reaction to a live comment of this pin, replacing any
  // they gave before, or takes it back (null). Anyone may react to their own,
  // as on Facebook. Resolves the comment's counts after it, or null when
  // there is no such comment.
  static async react(pinId: number, commentId: number, userId: number, reaction: CommentReactionName | null) {
    const [comment] = await db.query(
      `SELECT "id" FROM "Comment" WHERE "id" = $1 AND "pinId" = $2 AND "utcDeletedDateTime" IS NULL`,
      [commentId, pinId],
    );
    if (!comment) return null;
    if (reaction === null) {
      await db.query(`DELETE FROM "CommentReaction" WHERE "commentId" = $1 AND "userId" = $2`, [commentId, userId]);
    } else {
      await db.query(
        `INSERT INTO "CommentReaction" ("commentId", "userId", "reaction") VALUES ($1, $2, $3)
         ON CONFLICT ("commentId", "userId") DO UPDATE SET "reaction" = EXCLUDED."reaction", "utcUpdatedDateTime" = now()`,
        [commentId, userId, reaction],
      );
    }
    const [counts] = await db.query<{ reactions: Partial<Record<CommentReactionName, number>> }>(
      `SELECT COALESCE(json_object_agg("reaction", "n"), '{}'::json) AS "reactions"
       FROM (SELECT "reaction", COUNT(*)::integer AS "n" FROM "CommentReaction" WHERE "commentId" = $1 GROUP BY "reaction") AS "byKind"`,
      [commentId],
    );
    return { commentId, reactions: counts.reactions, myReaction: reaction };
  }

  // Reports a live comment of this pin for an admin to look at (0074): one per
  // person, a second changing the reason, and reopened if an admin had
  // dismissed it. null when there is no such comment; 'own' for the author's.
  static async report(pinId: number, commentId: number, userId: number, reason: CommentReportReason) {
    const [comment] = await db.query<{ userId: number }>(
      `SELECT "userId" FROM "Comment" WHERE "id" = $1 AND "pinId" = $2 AND "utcDeletedDateTime" IS NULL`,
      [commentId, pinId],
    );
    if (!comment) return null;
    if (comment.userId === userId) return 'own' as const;
    await db.query(
      `INSERT INTO "CommentReport" ("commentId", "userId", "reason") VALUES ($1, $2, $3)
       ON CONFLICT ("commentId", "userId") DO UPDATE
         SET "reason" = EXCLUDED."reason", "utcCreatedDateTime" = now(), "utcDismissedDateTime" = NULL, "dismissedByUserId" = NULL`,
      [commentId, userId, reason],
    );
    return 'reported' as const;
  }

  // Live comments with open reports, most reported first, for Admin > Reports.
  static openReports() {
    return db.query<{
      commentId: number;
      pinId: number;
      pinTitle: string;
      text: string;
      authorName: string;
      utcCreatedDateTime: Date;
      reports: number;
      reasons: Record<string, number>;
      lastReportedDateTime: Date;
    }>(`
    SELECT "c"."id" AS "commentId", "c"."pinId", "p"."title" AS "pinTitle", "c"."text", "u"."userName" AS "authorName",
           "c"."utcCreatedDateTime", COUNT(*)::integer AS "reports",
           (SELECT json_object_agg("reason", "n") FROM (
              SELECT "reason", COUNT(*)::integer AS "n" FROM "CommentReport"
              WHERE "commentId" = "c"."id" AND "utcDismissedDateTime" IS NULL GROUP BY "reason") AS "byReason") AS "reasons",
           MAX("r"."utcCreatedDateTime") AS "lastReportedDateTime"
    FROM "CommentReport" AS "r"
      JOIN "Comment" AS "c" ON "c"."id" = "r"."commentId" AND "c"."utcDeletedDateTime" IS NULL
      JOIN "Pin" AS "p" ON "p"."id" = "c"."pinId"
      LEFT JOIN "User" AS "u" ON "u"."id" = "c"."userId"
    WHERE "r"."utcDismissedDateTime" IS NULL
    GROUP BY "c"."id", "p"."title", "u"."userName"
    ORDER BY "reports" DESC, "lastReportedDateTime" DESC`);
  }

  // An admin's "nothing wrong here": the comment's open reports are closed.
  static async dismissReports(commentId: number, adminId: number) {
    const rows = await db.query(
      `UPDATE "CommentReport" SET "utcDismissedDateTime" = now(), "dismissedByUserId" = $2
       WHERE "commentId" = $1 AND "utcDismissedDateTime" IS NULL RETURNING "commentId"`,
      [commentId, adminId],
    );
    return rows.length;
  }

  // Every reaction to a live comment, for backups (scripts/data).
  static getAllReactions() {
    return db.query<{ commentId: number; userId: number; reaction: string; utcCreatedDateTime: Date; utcUpdatedDateTime: Date }>(`
    SELECT "r"."commentId", "r"."userId", "r"."reaction", "r"."utcCreatedDateTime", "r"."utcUpdatedDateTime"
    FROM "CommentReaction" AS "r"
      JOIN "Comment" AS "c" ON "c"."id" = "r"."commentId" AND "c"."utcDeletedDateTime" IS NULL
    ORDER BY "r"."commentId", "r"."userId"`);
  }

  static async restoreReactions(reactions: Row[]) {
    for (const r of reactions) {
      await db.query(
        `INSERT INTO "CommentReaction" ("commentId", "userId", "reaction", "utcCreatedDateTime", "utcUpdatedDateTime") VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [r.commentId, r.userId, r.reaction, r.utcCreatedDateTime, r.utcUpdatedDateTime],
      );
    }
  }

  // The tone scores on a company's pins, newest first and at most `limit` of
  // them: what a company: search's mood is read from (src/lib/commentMood.ts).
  // Comments waiting on a score come too, so the panel can say how many of the
  // comments it speaks for.
  static forCompany(companyId: number, limit: number) {
    return db.query<{ pinId: number; sentiment: number | null; utcCreatedDateTime: Date }>(
      `
    SELECT "Comment"."pinId", "Comment"."sentiment", "Comment"."utcCreatedDateTime"
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
