import * as db from '../db';
import type { QueryFn } from '../db';
import { emitDirectMessage, emitMessagesChanged } from '../events';
import { wordStartPattern } from '../util/searchQuery';
import { blockedBetween } from './blockSql';

export type ChatUser = { id: number; userName: string; pictureUrl: string | null };
export type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  // Empty once unsent.
  body: string;
  utcCreatedDateTime: Date;
  unsent: boolean;
  // The earlier message this one answers, quoted above it.
  replyTo: { id: number; senderId: number; body: string; unsent: boolean } | null;
};
export type ConversationSummary = {
  id: number;
  other: ChatUser;
  lastMessage: ChatMessage;
  unread: boolean;
  otherLastReadMessageId: number | null;
};

export const MAX_MESSAGE_LENGTH = 4000;
export const MESSAGE_REPORT_REASONS = ['spam', 'harassment', 'misleading', 'other'] as const;
export type MessageReportReason = (typeof MESSAGE_REPORT_REASONS)[number];
const THREAD_PAGE = 30;
const MESSAGE_COLUMNS = `"m"."id", "m"."conversationId", "m"."senderId", "m"."body", "m"."utcCreatedDateTime", "m"."utcUnsentDateTime",
  (SELECT json_build_object('id', "r"."id", 'senderId', "r"."senderId", 'body', "r"."body", 'unsent', "r"."utcUnsentDateTime" IS NOT NULL)
   FROM "Message" AS "r" WHERE "r"."id" = "m"."replyToId") AS "replyTo"`;

const pair = (a: number, b: number) => (a < b ? [a, b] : [b, a]);

// The other side of each of the viewer's conversations, as a join condition.
const OTHER_ID = `CASE WHEN "c"."userLowId" = $1 THEN "c"."userHighId" ELSE "c"."userLowId" END`;

function toMessage(row: db.Row): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    utcCreatedDateTime: row.utcCreatedDateTime,
    unsent: row.utcUnsentDateTime != null,
    replyTo: row.replyTo ?? null,
  };
}

async function chatUsers(ids: number[], query: QueryFn = db.query) {
  const rows = await query<ChatUser>(`SELECT "id", "userName", "pictureUrl" FROM "User" WHERE "id" = ANY($1::integer[])`, [ids]);
  return new Map(rows.map((u) => [u.id, u]));
}

// One-to-one chats (0092). A conversation across a block (either way) is
// hidden from both sides and takes no new messages, as comments are.
export default class Message {
  // The viewer's conversations, the latest message first.
  static async conversations(userId: number, limit = 50): Promise<ConversationSummary[]> {
    const rows = await db.query(
      `SELECT "c"."id", "o"."id" AS "otherId", "o"."userName", "o"."pictureUrl",
              "me"."lastReadMessageId", "them"."lastReadMessageId" AS "otherLastReadMessageId",
              ${MESSAGE_COLUMNS}, "m"."id" AS "messageId"
       FROM "ConversationMember" AS "me"
         JOIN "Conversation" AS "c" ON "c"."id" = "me"."conversationId"
         JOIN "User" AS "o" ON "o"."id" = ${OTHER_ID} AND "o"."utcDeletedDateTime" IS NULL
         JOIN "Message" AS "m" ON "m"."id" = "c"."lastMessageId"
         LEFT JOIN "ConversationMember" AS "them" ON "them"."conversationId" = "c"."id" AND "them"."userId" = "o"."id"
       WHERE "me"."userId" = $1 AND NOT ${blockedBetween('$1::integer', '"o"."id"')}
       ORDER BY "c"."utcLastMessageDateTime" DESC
       LIMIT $2`,
      [userId, Math.min(Math.max(limit, 1), 100)],
    );
    return rows.map((row) => ({
      id: row.id,
      other: { id: row.otherId, userName: row.userName, pictureUrl: row.pictureUrl },
      lastMessage: toMessage({ ...row, id: row.messageId }),
      unread: row.senderId !== userId && row.messageId > (row.lastReadMessageId ?? 0),
      otherLastReadMessageId: row.otherLastReadMessageId,
    }));
  }

  // How many conversations hold a message the viewer has not seen: the
  // navbar badge, as Messenger counts chats rather than messages.
  static async unreadCount(userId: number): Promise<number> {
    const [row] = await db.query<{ count: number }>(
      `SELECT COUNT(*)::integer AS "count"
       FROM "ConversationMember" AS "me"
         JOIN "Conversation" AS "c" ON "c"."id" = "me"."conversationId"
         JOIN "Message" AS "m" ON "m"."id" = "c"."lastMessageId"
         JOIN "User" AS "o" ON "o"."id" = ${OTHER_ID} AND "o"."utcDeletedDateTime" IS NULL
       WHERE "me"."userId" = $1 AND "m"."senderId" <> $1 AND "m"."id" > COALESCE("me"."lastReadMessageId", 0)
         AND NOT ${blockedBetween('$1::integer', '"o"."id"')}`,
      [userId],
    );
    return row.count;
  }

  // A page of the chat with otherId, oldest first, ending before `before`
  // (a message id) or at the newest.
  static async thread(userId: number, otherId: number, before?: number | null) {
    const [low, high] = pair(userId, otherId);
    const [conversation] = await db.query<{ id: number; otherLastReadMessageId: number | null }>(
      `SELECT "c"."id", "them"."lastReadMessageId" AS "otherLastReadMessageId"
       FROM "Conversation" AS "c"
         LEFT JOIN "ConversationMember" AS "them" ON "them"."conversationId" = "c"."id" AND "them"."userId" = $3
       WHERE "c"."userLowId" = $1 AND "c"."userHighId" = $2`,
      [low, high, otherId],
    );
    if (!conversation) return { conversationId: null, messages: [] as ChatMessage[], hasMore: false, otherLastReadMessageId: null };
    const rows = await db.query(
      `SELECT ${MESSAGE_COLUMNS} FROM "Message" AS "m"
       WHERE "m"."conversationId" = $1 AND ($2::integer IS NULL OR "m"."id" < $2)
       ORDER BY "m"."id" DESC
       LIMIT $3`,
      [conversation.id, before ?? null, THREAD_PAGE + 1],
    );
    return {
      conversationId: conversation.id,
      messages: rows.slice(0, THREAD_PAGE).reverse().map(toMessage),
      hasMore: rows.length > THREAD_PAGE,
      otherLastReadMessageId: conversation.otherLastReadMessageId,
    };
  }

  // Sends body from senderId to recipientId, starting their conversation if
  // this is the first message. The sender has seen their own message. Both
  // sides' open pages hear of it once it is committed.
  static send(senderId: number, recipientId: number, body: string, replyToId: number | null = null) {
    const [low, high] = pair(senderId, recipientId);
    return db.transaction(async (query) => {
      const [conversation] = await query<{ id: number }>(
        `INSERT INTO "Conversation" ("userLowId", "userHighId") VALUES ($1, $2)
         ON CONFLICT ("userLowId", "userHighId") DO UPDATE SET "userLowId" = EXCLUDED."userLowId"
         RETURNING "id"`,
        [low, high],
      );
      await query(
        `INSERT INTO "ConversationMember" ("conversationId", "userId") VALUES ($1, $2), ($1, $3) ON CONFLICT DO NOTHING`,
        [conversation.id, low, high],
      );
      const [row] = await query(
        // A reply only to a message of this same chat; anything else is dropped.
        `INSERT INTO "Message" AS "m" ("conversationId", "senderId", "body", "replyToId")
         VALUES ($1, $2, $3, (SELECT "id" FROM "Message" WHERE "id" = $4 AND "conversationId" = $1))
         RETURNING ${MESSAGE_COLUMNS}`,
        [conversation.id, senderId, body, replyToId],
      );
      const message = toMessage(row);
      await query(`UPDATE "Conversation" SET "lastMessageId" = $2, "utcLastMessageDateTime" = $3 WHERE "id" = $1`, [
        conversation.id,
        message.id,
        message.utcCreatedDateTime,
      ]);
      await query(`UPDATE "ConversationMember" SET "lastReadMessageId" = $3 WHERE "conversationId" = $1 AND "userId" = $2`, [
        conversation.id,
        senderId,
        message.id,
      ]);
      const users = await chatUsers([senderId, recipientId], query);
      db.afterCommit(query, () => {
        // Each side is told who the chat is with: for the sender's other
        // tabs that is the recipient.
        emitDirectMessage({ userId: recipientId, data: { kind: 'message', message, with: users.get(senderId) } });
        emitDirectMessage({ userId: senderId, data: { kind: 'message', message, with: users.get(recipientId) } });
        emitMessagesChanged(recipientId);
        // Answering reads what came before.
        emitMessagesChanged(senderId);
      });
      return message;
    });
  }

  // The viewer has seen everything in their chat with otherId. The other
  // side's open pages move their "Seen" mark; the viewer's own tabs recount.
  static async markRead(userId: number, otherId: number) {
    const [low, high] = pair(userId, otherId);
    const [row] = await db.query<{ conversationId: number; messageId: number }>(
      `UPDATE "ConversationMember" AS "me" SET "lastReadMessageId" = "c"."lastMessageId"
       FROM "Conversation" AS "c"
       WHERE "c"."id" = "me"."conversationId" AND "me"."userId" = $1 AND "c"."userLowId" = $2 AND "c"."userHighId" = $3
         AND "me"."lastReadMessageId" IS DISTINCT FROM "c"."lastMessageId"
       RETURNING "c"."id" AS "conversationId", "c"."lastMessageId" AS "messageId"`,
      [userId, low, high],
    );
    if (!row) return false;
    emitDirectMessage({ userId: otherId, data: { kind: 'read', conversationId: row.conversationId, userId, messageId: row.messageId } });
    emitDirectMessage({ userId, data: { kind: 'read', conversationId: row.conversationId, userId, messageId: row.messageId } });
    emitMessagesChanged(userId);
    return true;
  }

  // People the viewer can start a chat with, by a word of their handle:
  // pin authors, anyone they follow or who follows them, and anyone they
  // have talked with - never a reader who is otherwise unknown to them.
  static people(userId: number, text: string, limit = 8) {
    const handle = text.trim().replace(/^@+/, '');
    if (!handle) return Promise.resolve([] as ChatUser[]);
    return db.query<ChatUser>(
      `SELECT "u"."id", "u"."userName", "u"."pictureUrl"
       FROM "User" AS "u"
       WHERE "u"."utcDeletedDateTime" IS NULL AND "u"."id" <> $1 AND "u"."userName" ~* $2
         AND NOT ${blockedBetween('$1::integer', '"u"."id"')}
         AND (EXISTS (SELECT 1 FROM "Pin" WHERE "Pin"."userId" = "u"."id" AND "Pin"."utcDeletedDateTime" IS NULL)
           OR EXISTS (SELECT 1 FROM "Follow" AS "f" WHERE "f"."utcDeletedDateTime" IS NULL
                        AND (("f"."followerId" = $1 AND "f"."followeeId" = "u"."id") OR ("f"."followerId" = "u"."id" AND "f"."followeeId" = $1)))
           OR EXISTS (SELECT 1 FROM "ConversationMember" AS "a" JOIN "ConversationMember" AS "b" ON "b"."conversationId" = "a"."conversationId"
                        WHERE "a"."userId" = $1 AND "b"."userId" = "u"."id"))
       ORDER BY "u"."userName"
       LIMIT $3`,
      [userId, wordStartPattern(handle), limit],
    );
  }

  // One of the messages between userId and otherId, changed by `set` (SQL
  // over "Message" AS "m", params from $4) where `where` holds; both sides'
  // open pages get the new state. Null when there is no such message.
  private static async change(userId: number, otherId: number, messageId: number, set: string, where: string, params: unknown[] = []) {
    const [low, high] = pair(userId, otherId);
    const [row] = await db.query(
      `UPDATE "Message" AS "m" SET ${set}
       FROM "Conversation" AS "c"
       WHERE "m"."id" = $1 AND "c"."id" = "m"."conversationId" AND "c"."userLowId" = $2 AND "c"."userHighId" = $3 AND ${where}
       RETURNING ${MESSAGE_COLUMNS}`,
      [messageId, low, high, ...params],
    );
    if (!row) return null;
    const message = toMessage(row);
    const users = await chatUsers([userId, otherId]);
    emitDirectMessage({ userId: otherId, data: { kind: 'update', message, with: users.get(userId) } });
    emitDirectMessage({ userId, data: { kind: 'update', message, with: users.get(otherId) } });
    return message;
  }

  // The sender takes a message back: its text is wiped, and
  // both sides see that it was unsent.
  static unsend(userId: number, otherId: number, messageId: number) {
    return Message.change(
      userId,
      otherId,
      messageId,
      `"body" = '', "utcUnsentDateTime" = now()`,
      `"m"."senderId" = $4 AND "m"."utcUnsentDateTime" IS NULL`,
      [userId],
    );
  }

  // Reports the other side's message for an admin to look at, with its text
  // as it stands. A second report changes the reason (and reopens one an
  // admin dismissed). False when there is no such message to report.
  static async report(userId: number, otherId: number, messageId: number, reason: MessageReportReason) {
    const [low, high] = pair(userId, otherId);
    const rows = await db.query(
      `INSERT INTO "MessageReport" ("messageId", "userId", "reason", "body")
       SELECT "m"."id", $4, $5, "m"."body"
       FROM "Message" AS "m" JOIN "Conversation" AS "c" ON "c"."id" = "m"."conversationId"
       WHERE "m"."id" = $1 AND "c"."userLowId" = $2 AND "c"."userHighId" = $3 AND "m"."senderId" <> $4 AND "m"."utcUnsentDateTime" IS NULL
       ON CONFLICT ("messageId", "userId") DO UPDATE
         SET "reason" = EXCLUDED."reason", "body" = EXCLUDED."body", "utcCreatedDateTime" = now(), "utcDismissedDateTime" = NULL, "dismissedByUserId" = NULL
       RETURNING "messageId"`,
      [messageId, low, high, userId, reason],
    );
    return rows.length > 0;
  }

  // Messages with open reports, most reported first (Admin > Comments).
  static openReports() {
    return db.query<{
      messageId: number;
      body: string;
      senderName: string | null;
      reporterNames: string[];
      utcCreatedDateTime: Date;
      reports: number;
      reasons: Record<string, number>;
      unsent: boolean;
    }>(`
    SELECT "m"."id" AS "messageId", (ARRAY_AGG("r"."body" ORDER BY "r"."utcCreatedDateTime" DESC))[1] AS "body",
           "s"."userName" AS "senderName", ARRAY_AGG("ru"."userName") AS "reporterNames",
           "m"."utcCreatedDateTime", COUNT(*)::integer AS "reports",
           (SELECT json_object_agg("reason", "n") FROM (
              SELECT "reason", COUNT(*)::integer AS "n" FROM "MessageReport"
              WHERE "messageId" = "m"."id" AND "utcDismissedDateTime" IS NULL GROUP BY "reason") AS "byReason") AS "reasons",
           "m"."utcUnsentDateTime" IS NOT NULL AS "unsent"
    FROM "MessageReport" AS "r"
      JOIN "Message" AS "m" ON "m"."id" = "r"."messageId"
      LEFT JOIN "User" AS "s" ON "s"."id" = "m"."senderId"
      LEFT JOIN "User" AS "ru" ON "ru"."id" = "r"."userId"
    WHERE "r"."utcDismissedDateTime" IS NULL
    GROUP BY "m"."id", "s"."userName"
    ORDER BY "reports" DESC, MAX("r"."utcCreatedDateTime") DESC`);
  }

  // An admin looked: the message's open reports are closed.
  static async dismissReports(messageId: number, adminId: number) {
    const rows = await db.query(
      `UPDATE "MessageReport" SET "utcDismissedDateTime" = now(), "dismissedByUserId" = $2
       WHERE "messageId" = $1 AND "utcDismissedDateTime" IS NULL RETURNING "messageId"`,
      [messageId, adminId],
    );
    return rows.length;
  }

  // Every chat as stored, for backups (scripts/data, seedMessages.json).
  static async getAll() {
    const [conversations, members, messages, reports] = await Promise.all([
      db.query(`SELECT * FROM "Conversation" ORDER BY "id"`),
      db.query(`SELECT * FROM "ConversationMember" ORDER BY "conversationId", "userId"`),
      db.query(`SELECT * FROM "Message" ORDER BY "id"`),
      db.query(`SELECT * FROM "MessageReport" ORDER BY "messageId", "userId"`),
    ]);
    return { conversations, members, messages, reports };
  }

  // Puts a backup back with its ids, so replies, read marks and reports
  // still point where they did. Messages go in id order (a reply only ever
  // answers an earlier one); each conversation's latest follows them.
  static restore(data: { conversations?: db.Row[]; members?: db.Row[]; messages?: db.Row[]; reports?: db.Row[] } | undefined) {
    if (!data) return Promise.resolve();
    return db.transaction(async (query) => {
      for (const c of data.conversations ?? []) {
        await query(
          `INSERT INTO "Conversation" ("id", "userLowId", "userHighId", "utcCreatedDateTime", "utcLastMessageDateTime") VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [c.id, c.userLowId, c.userHighId, c.utcCreatedDateTime, c.utcLastMessageDateTime],
        );
      }
      for (const m of [...(data.messages ?? [])].sort((a, b) => a.id - b.id)) {
        await query(
          `INSERT INTO "Message" ("id", "conversationId", "senderId", "body", "utcCreatedDateTime", "utcUnsentDateTime", "replyToId")
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [m.id, m.conversationId, m.senderId, m.body, m.utcCreatedDateTime, m.utcUnsentDateTime, m.replyToId],
        );
      }
      for (const c of data.conversations ?? []) {
        if (c.lastMessageId != null) await query(`UPDATE "Conversation" SET "lastMessageId" = $2 WHERE "id" = $1`, [c.id, c.lastMessageId]);
      }
      for (const m of data.members ?? []) {
        await query(`INSERT INTO "ConversationMember" ("conversationId", "userId", "lastReadMessageId") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [
          m.conversationId,
          m.userId,
          m.lastReadMessageId,
        ]);
      }
      for (const r of data.reports ?? []) {
        await query(
          `INSERT INTO "MessageReport" ("messageId", "userId", "reason", "body", "utcCreatedDateTime", "utcDismissedDateTime", "dismissedByUserId")
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [r.messageId, r.userId, r.reason, r.body, r.utcCreatedDateTime, r.utcDismissedDateTime, r.dismissedByUserId],
        );
      }
      for (const table of ['Conversation', 'Message']) {
        await query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT MAX("id") FROM "${table}"), 1))`);
      }
    });
  }

  static async user(id: number): Promise<ChatUser | null> {
    const [row] = await db.query<ChatUser>(`SELECT "id", "userName", "pictureUrl" FROM "User" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [id]);
    return row ?? null;
  }
}
