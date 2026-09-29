import * as db from '../db';
import type { QueryFn } from '../db';
import {
  countTurns,
  RATING_TURNS,
  type ChatListing,
  type ListingInput,
  type ListingJson,
  type ListingKind,
  type ListingStatus,
  type RatingInput,
  type RatingRole,
  type RatingSummary,
} from '@/lib/listings';
import { tagGroupPatterns } from '@/lib/tags';
import { blockedBetween } from './blockSql';

// Marketplace listings on product pins, or on their own (0097), and the
// ratings their chats earn (0095). Static queries, as Message is.

// Uploaded photos and videos are the seller's own blobs.
export const MEDIA_PREFIX = 'listing/';
export const isOwnMedia = (userId: number, name: string) => name.startsWith(`${MEDIA_PREFIX}${userId}-`) && !name.includes('..');

export type ReceivedRating = RatingInput & {
  id: number;
  role: RatingRole;
  listingId: number;
  listingTitle: string;
  rater: { id: number; userName: string; pictureUrl: string | null };
  utcCreatedDateTime: Date;
};

export type AdminListing = {
  id: number;
  pinId: number | null;
  kind: ListingKind;
  status: ListingStatus;
  title: string;
  price: number | null;
  currency: string;
  photo: string | null;
  locationName: string | null;
  utcCreatedDateTime: Date;
  utcUpdatedDateTime: Date;
  utcDeletedDateTime: Date | null;
  sellerId: number;
  sellerName: string;
  pinTitle: string | null;
  chats: number;
  ratings: number;
  // The average stars given over it, either side.
  stars: number | null;
};

const COLUMNS =`"l"."id", "l"."pinId", "l"."userId", "l"."kind", "l"."status", "l"."title", "l"."price", "l"."currency",
  "l"."description", "l"."details", "l"."photos", "l"."video", "l"."locationLatitude", "l"."locationLongitude", "l"."locationName",
  "l"."utcCreatedDateTime", "l"."utcUpdatedDateTime",
  "u"."userName", "u"."pictureUrl"`;

function toListing(row: db.Row, ratings: Map<number, RatingSummary>, asked?: Set<number>): ListingJson {
  return {
    ...(asked ? { asked: asked.has(row.id) } : {}),
    id: row.id,
    pinId: row.pinId,
    kind: row.kind,
    status: row.status,
    title: row.title,
    price: row.price,
    currency: row.currency,
    description: row.description,
    details: row.details ?? {},
    photos: row.photos ?? [],
    video: row.video,
    location:
      row.locationLatitude != null && row.locationLongitude != null
        ? { latitude: row.locationLatitude, longitude: row.locationLongitude, name: row.locationName }
        : null,
    utcCreatedDateTime: row.utcCreatedDateTime,
    utcUpdatedDateTime: row.utcUpdatedDateTime,
    seller: { id: row.userId, userName: row.userName, pictureUrl: row.pictureUrl },
    sellerRating: ratings.get(row.userId) ?? { average: null, count: 0 },
    ...(row.pinTitle !== undefined ? { pinTitle: row.pinTitle, chats: row.chats } : {}),
  };
}

const values = (input: ListingInput) => [
  input.title,
  input.price,
  input.description,
  JSON.stringify(input.details),
  input.photos,
  input.video,
  input.location?.latitude ?? null,
  input.location?.longitude ?? null,
  input.location?.name?.trim() || null,
];

export default class Listing {
  // How each user is rated as a seller: the stars a listing card shows.
  static async sellerRatings(userIds: number[], query: QueryFn = db.query): Promise<Map<number, RatingSummary>> {
    if (!userIds.length) return new Map();
    const rows = await query<{ rateeId: number; average: number; count: number }>(
      `SELECT "rateeId", ROUND(AVG("stars")::numeric, 1) AS "average", COUNT(*)::integer AS "count"
       FROM "ListingRating" WHERE "role" = 'seller' AND "rateeId" = ANY($1::integer[]) GROUP BY "rateeId"`,
      [[...new Set(userIds)]],
    );
    return new Map(rows.map((r) => [r.rateeId, { average: r.average, count: r.count }]));
  }

  // With a viewer, each also says whether they already have a chat about it.
  private static async withRatings(rows: db.Row[], viewerId: number | null = null) {
    const [ratings, asked] = await Promise.all([
      Listing.sellerRatings(rows.map((r) => r.userId)),
      viewerId ? Listing.askedAbout(viewerId, rows.map((r) => r.id)) : undefined,
    ]);
    return rows.map((row) => toListing(row, ratings, asked));
  }

  // Of these listings, the ones a chat the viewer is in has asked about.
  static async askedAbout(viewerId: number, listingIds: number[]): Promise<Set<number>> {
    if (!listingIds.length) return new Set();
    const rows = await db.query<{ listingId: number }>(
      `SELECT DISTINCT "m"."listingId" FROM "Message" AS "m"
         JOIN "ConversationMember" AS "cm" ON "cm"."conversationId" = "m"."conversationId" AND "cm"."userId" = $1
       WHERE "m"."listingId" = ANY($2::integer[])`,
      [viewerId, listingIds],
    );
    return new Set(rows.map((r) => r.listingId));
  }

  // A pin's listings still on offer, newest first, leaving out any seller a
  // block stands between the viewer and.
  static async forPin(pinId: number, viewerId: number | null) {
    const rows = await db.query(
      `SELECT ${COLUMNS} FROM "Listing" AS "l" JOIN "User" AS "u" ON "u"."id" = "l"."userId" AND "u"."utcDeletedDateTime" IS NULL
       WHERE "l"."pinId" = $1 AND "l"."utcDeletedDateTime" IS NULL AND "l"."status" <> 'sold'
         AND ($2::integer IS NULL OR NOT ${blockedBetween('$2::integer', '"l"."userId"')})
       ORDER BY "l"."id" DESC`,
      [pinId, viewerId],
    );
    return Listing.withRatings(rows, viewerId);
  }

  // Every listing still on offer that says where it is (one pin's, given
  // pinId), for the map's Marketplace layer: newest first, capped, and without any seller a block
  // stands between the viewer and. The map's filters narrow it as they do
  // the pins: createdSince by when the listing was posted, and tags (any
  // of) / excludeTags (none of) by its pin's tags, matched as a tag: term
  // is - so a listing with no pin goes once a tag is picked.
  static async onMap(
    viewerId: number | null,
    // The pins whose listings to keep to (a query's pin: terms); none, every pin's.
    pinIds: number[] = [],
    filter: { createdSince?: Date | null; tags?: string[]; excludeTags?: string[] } = {},
    limit = 2000,
  ) {
    const tags = filter.tags ?? [];
    const excludeTags = filter.excludeTags ?? [];
    const tagged = (params: string, patterns: string) =>
      `EXISTS (SELECT 1 FROM "PinTagView" AS "tg" WHERE "tg"."pinId" = "l"."pinId" AND ("tg"."name" = ANY(${params}::citext[]) OR "tg"."name"::text ~* ANY(${patterns}::text[])))`;
    const rows = await db.query(
      `SELECT ${COLUMNS} FROM "Listing" AS "l" JOIN "User" AS "u" ON "u"."id" = "l"."userId" AND "u"."utcDeletedDateTime" IS NULL
       WHERE "l"."utcDeletedDateTime" IS NULL AND "l"."status" <> 'sold'
         AND "l"."locationLatitude" IS NOT NULL AND "l"."locationLongitude" IS NOT NULL
         AND ($1::integer IS NULL OR NOT ${blockedBetween('$1::integer', '"l"."userId"')})
         AND (cardinality($2::integer[]) = 0 OR "l"."pinId" = ANY($2::integer[]))
         AND ($4::timestamptz IS NULL OR "l"."utcCreatedDateTime" >= $4)
         AND (cardinality($5::text[]) = 0 OR ${tagged('$5', '$6')})
         AND (cardinality($7::text[]) = 0 OR "l"."pinId" IS NULL OR NOT ${tagged('$7', '$8')})
       ORDER BY "l"."id" DESC LIMIT $3`,
      [viewerId, pinIds, limit, filter.createdSince ?? null, tags, tagGroupPatterns(tags), excludeTags, tagGroupPatterns(excludeTags)],
    );
    return Listing.withRatings(rows, viewerId);
  }

  static async get(id: number, viewerId: number | null = null) {
    const rows = await db.query(
      `SELECT ${COLUMNS} FROM "Listing" AS "l" JOIN "User" AS "u" ON "u"."id" = "l"."userId"
       WHERE "l"."id" = $1 AND "l"."utcDeletedDateTime" IS NULL`,
      [id],
    );
    return rows.length ? (await Listing.withRatings(rows, viewerId))[0] : null;
  }

  // The seller's own listings, sold ones too, with the pin each is on (none
  // for one posted on its own) and how many chats it started.
  static async mine(userId: number) {
    const rows = await db.query(
      `SELECT ${COLUMNS}, "p"."title" AS "pinTitle",
              (SELECT COUNT(DISTINCT "m"."conversationId")::integer FROM "Message" AS "m" WHERE "m"."listingId" = "l"."id") AS "chats"
       FROM "Listing" AS "l" JOIN "User" AS "u" ON "u"."id" = "l"."userId" LEFT JOIN "Pin" AS "p" ON "p"."id" = "l"."pinId"
       WHERE "l"."userId" = $1 AND "l"."utcDeletedDateTime" IS NULL
       ORDER BY "l"."utcUpdatedDateTime" DESC`,
      [userId],
    );
    return Listing.withRatings(rows);
  }

  // On a pin, or on its own when pinId is null.
  static async create(pinId: number | null, userId: number, kind: ListingKind, input: ListingInput) {
    const [row] = await db.query<{ id: number }>(
      `INSERT INTO "Listing" ("pinId", "userId", "kind", "title", "price", "description", "details", "photos", "video",
                              "locationLatitude", "locationLongitude", "locationName")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING "id"`,
      [pinId, userId, kind, ...values(input)],
    );
    return row.id;
  }

  // The seller's change to their listing. Resolves the media it no longer
  // uses, for the caller to delete, or null when it is not theirs.
  static async update(id: number, userId: number, input: ListingInput) {
    return db.transaction(async (query) => {
      const [before] = await query<{ photos: string[]; video: string | null }>(
        `SELECT "photos", "video" FROM "Listing" WHERE "id" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL FOR UPDATE`,
        [id, userId],
      );
      if (!before) return null;
      await query(
        `UPDATE "Listing" SET "title" = $3, "price" = $4, "description" = $5, "details" = $6, "photos" = $7, "video" = $8,
           "locationLatitude" = $9, "locationLongitude" = $10, "locationName" = $11, "utcUpdatedDateTime" = now()
         WHERE "id" = $1 AND "userId" = $2`,
        [id, userId, ...values(input)],
      );
      const kept = new Set([...input.photos, input.video]);
      return [...before.photos, before.video].filter((name): name is string => !!name && !kept.has(name));
    });
  }

  static async setStatus(id: number, userId: number, status: ListingStatus) {
    const rows = await db.query(
      `UPDATE "Listing" SET "status" = $3, "utcUpdatedDateTime" = now() WHERE "id" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL RETURNING "id"`,
      [id, userId, status],
    );
    return rows.length > 0;
  }

  // Marked deleted, so the ratings over it stay. Resolves its media, for the
  // caller to delete, or null when it is not theirs.
  static async remove(id: number, userId: number) {
    const [row] = await db.query<{ photos: string[]; video: string | null }>(
      `WITH "old" AS (SELECT "id", "photos", "video" FROM "Listing" WHERE "id" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL FOR UPDATE)
       UPDATE "Listing" AS "l" SET "utcDeletedDateTime" = now(), "photos" = '{}', "video" = NULL
       FROM "old" WHERE "l"."id" = "old"."id"
       RETURNING "old"."photos", "old"."video"`,
      [id, userId],
    );
    return row ? [...row.photos, row.video].filter((name): name is string => !!name) : null;
  }

  // Who listed it, deleted or not (a rating can still be given over it).
  static async sellerOf(id: number) {
    const [row] = await db.query<{ userId: number }>(`SELECT "userId" FROM "Listing" WHERE "id" = $1`, [id]);
    return row?.userId ?? null;
  }

  // A listing a buyer may open a chat about: on offer, and not their own.
  static async askable(listingId: number, buyerId: number, sellerId: number) {
    const [row] = await db.query(
      `SELECT 1 FROM "Listing" WHERE "id" = $1 AND "userId" = $3 AND "userId" <> $2 AND "status" <> 'sold' AND "utcDeletedDateTime" IS NULL`,
      [listingId, buyerId, sellerId],
    );
    return !!row;
  }

  // The listings a chat between the viewer and otherId is about, each with
  // its turns so far and the viewer's rating over it.
  static async inChat(viewerId: number, otherId: number, conversationId: number): Promise<ChatListing[]> {
    const listings = await db.query(
      `SELECT "l"."id", "l"."pinId", "l"."kind", "l"."title", "l"."price", "l"."currency", "l"."status", "l"."photos"[1] AS "photo", "l"."video",
              "l"."userId" AS "sellerId", "f"."firstId", "l"."utcDeletedDateTime" IS NOT NULL AS "deleted",
              (SELECT json_build_object('stars', "r"."stars", 'tags', "r"."tags", 'body', "r"."body", 'role', "r"."role")
               FROM "ListingRating" AS "r" WHERE "r"."listingId" = "l"."id" AND "r"."raterId" = $2) AS "myRating"
       FROM (SELECT "listingId", MIN("id") AS "firstId" FROM "Message" WHERE "conversationId" = $1 AND "listingId" IS NOT NULL GROUP BY "listingId") AS "f"
         JOIN "Listing" AS "l" ON "l"."id" = "f"."listingId"
       WHERE "l"."userId" IN ($2, $3)
       ORDER BY "f"."firstId" DESC`,
      [conversationId, viewerId, otherId],
    );
    if (!listings.length) return [];
    const earliest = Math.min(...listings.map((l) => l.firstId));
    const messages = await db.query<{ id: number; senderId: number }>(
      `SELECT "id", "senderId" FROM "Message" WHERE "conversationId" = $1 AND "id" >= $2 AND "utcUnsentDateTime" IS NULL ORDER BY "id"`,
      [conversationId, earliest],
    );
    const last = messages[messages.length - 1];
    return listings.map((l) => {
      const since = messages.filter((m) => m.id >= l.firstId);
      return {
        id: l.id,
        pinId: l.pinId,
        kind: l.kind,
        title: l.title,
        price: l.price,
        currency: l.currency,
        // A deleted listing reads as gone; the chat can still rate over it.
        status: l.deleted ? 'sold' : l.status,
        photo: l.deleted ? null : l.photo,
        video: l.deleted ? null : l.video,
        sellerId: l.sellerId,
        turns: countTurns(since.map((m) => m.senderId)),
        throughMessageId: last?.id ?? 0,
        lastSenderId: last?.senderId ?? 0,
        myRating: l.myRating,
      };
    });
  }

  // Rates the other side of a chat about a listing. Null when the two have
  // no such chat, or it has not yet run RATING_TURNS turns.
  static async rate(listingId: number, raterId: number, rateeId: number, input: RatingInput) {
    const [pair] = await db.query<{ conversationId: number; sellerId: number }>(
      `SELECT "c"."id" AS "conversationId", "l"."userId" AS "sellerId"
       FROM "Listing" AS "l" JOIN "Conversation" AS "c" ON "c"."userLowId" = LEAST($2::integer, $3::integer) AND "c"."userHighId" = GREATEST($2::integer, $3::integer)
       WHERE "l"."id" = $1 AND "l"."userId" IN ($2, $3)`,
      [listingId, raterId, rateeId],
    );
    if (!pair) return null;
    const chat = (await Listing.inChat(raterId, rateeId, pair.conversationId)).find((l) => l.id === listingId);
    if (!chat || chat.turns < RATING_TURNS) return null;
    const role: RatingRole = rateeId === pair.sellerId ? 'seller' : 'buyer';
    const [row] = await db.query(
      `INSERT INTO "ListingRating" ("listingId", "raterId", "rateeId", "role", "stars", "tags", "body")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("listingId", "raterId") DO UPDATE
         SET "rateeId" = EXCLUDED."rateeId", "role" = EXCLUDED."role", "stars" = EXCLUDED."stars", "tags" = EXCLUDED."tags",
             "body" = EXCLUDED."body", "utcUpdatedDateTime" = now()
       RETURNING "stars", "tags", "body", "role"`,
      [listingId, raterId, rateeId, role, input.stars, input.tags, input.body],
    );
    return row as RatingInput & { role: RatingRole };
  }

  // The ratings a user has been given, as a seller and as a buyer, newest first.
  static received(userId: number, limit = 50) {
    return db.query<ReceivedRating>(
      `SELECT "r"."id", "r"."role", "r"."stars", "r"."tags", "r"."body", "r"."utcCreatedDateTime", "r"."listingId", "l"."title" AS "listingTitle",
              json_build_object('id', "u"."id", 'userName', "u"."userName", 'pictureUrl', "u"."pictureUrl") AS "rater"
       FROM "ListingRating" AS "r" JOIN "Listing" AS "l" ON "l"."id" = "r"."listingId" JOIN "User" AS "u" ON "u"."id" = "r"."raterId"
       WHERE "r"."rateeId" = $1
       ORDER BY "r"."utcUpdatedDateTime" DESC
       LIMIT $2`,
      [userId, limit],
    );
  }

  // Every listing, deleted ones too, for the admin's Listings tab: its seller,
  // its pin, its first photo, the chats it started and the ratings given
  // over it. Newest first.
  static admin() {
    return db.query<AdminListing>(
      `SELECT "l"."id", "l"."pinId", "l"."kind", "l"."status", "l"."title", "l"."price", "l"."currency",
              "l"."photos"[1] AS "photo", "l"."locationName",
              "l"."utcCreatedDateTime", "l"."utcUpdatedDateTime", "l"."utcDeletedDateTime",
              "l"."userId" AS "sellerId", "u"."userName" AS "sellerName", "p"."title" AS "pinTitle",
              COALESCE("c"."chats", 0) AS "chats", COALESCE("r"."ratings", 0) AS "ratings", "r"."stars"
       FROM "Listing" AS "l"
         JOIN "User" AS "u" ON "u"."id" = "l"."userId"
         LEFT JOIN "Pin" AS "p" ON "p"."id" = "l"."pinId"
         LEFT JOIN (SELECT "listingId", COUNT(DISTINCT "conversationId")::integer AS "chats" FROM "Message"
                    WHERE "listingId" IS NOT NULL GROUP BY "listingId") AS "c" ON "c"."listingId" = "l"."id"
         LEFT JOIN (SELECT "listingId", COUNT(*)::integer AS "ratings", ROUND(AVG("stars")::numeric, 1) AS "stars" FROM "ListingRating"
                    GROUP BY "listingId") AS "r" ON "r"."listingId" = "l"."id"
       ORDER BY "l"."id" DESC`,
    );
  }

  // Every listing and rating, for backups (scripts/data, seedListings.json).
  static async getAll() {
    const [listings, ratings] = await Promise.all([
      db.query(`SELECT * FROM "Listing" ORDER BY "id"`),
      db.query(`SELECT * FROM "ListingRating" ORDER BY "id"`),
    ]);
    return { listings, ratings };
  }

  // Puts a backup back with its ids, before the messages that name them.
  static restore(data: { listings?: db.Row[]; ratings?: db.Row[] } | undefined) {
    if (!data) return Promise.resolve();
    return db.transaction(async (query) => {
      for (const l of data.listings ?? []) {
        await query(
          `INSERT INTO "Listing" ("id", "pinId", "userId", "kind", "status", "title", "price", "currency", "description", "details", "photos", "video",
                                  "locationLatitude", "locationLongitude", "locationName", "utcCreatedDateTime", "utcUpdatedDateTime", "utcDeletedDateTime")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT DO NOTHING`,
          [
            l.id, l.pinId, l.userId, l.kind, l.status, l.title, l.price, l.currency, l.description, JSON.stringify(l.details ?? {}), l.photos, l.video,
            l.locationLatitude, l.locationLongitude, l.locationName, l.utcCreatedDateTime, l.utcUpdatedDateTime, l.utcDeletedDateTime,
          ],
        );
      }
      for (const r of data.ratings ?? []) {
        await query(
          `INSERT INTO "ListingRating" ("id", "listingId", "raterId", "rateeId", "role", "stars", "tags", "body", "utcCreatedDateTime", "utcUpdatedDateTime")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING`,
          [r.id, r.listingId, r.raterId, r.rateeId, r.role, r.stars, r.tags, r.body, r.utcCreatedDateTime, r.utcUpdatedDateTime],
        );
      }
      for (const table of ['Listing', 'ListingRating']) {
        await query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT MAX("id") FROM "${table}"), 1))`);
      }
    });
  }
}
