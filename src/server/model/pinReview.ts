import * as db from '../db';
import type { Row } from '../db';
import type { PinReviewJson, ReviewSummary } from '@/lib/userReviews';

// Reader reviews on pins (0209). Static queries, as PinPhoto's are.

const SELECT = `
  SELECT "r"."id", "r"."pinId", "r"."userId", "u"."userName", "u"."pictureUrl", "r"."stars", "r"."comment",
         COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p."id", 'blobName', p."blobName", 'width', p."width", 'height', p."height", 'caption', p."caption", 'hidden', p."status" = 'hidden') ORDER BY p."id")
           FROM "PinPhoto" p WHERE p."reviewId" = "r"."id" AND p."utcDeletedDateTime" IS NULL
             AND (p."status" = 'visible' OR "r"."userId" = $2)), '[]'::jsonb) AS "photos",
         ("r"."userId" = $2) AS "mine", "r"."utcCreatedDateTime", "r"."utcUpdatedDateTime"
    FROM "PinReview" "r"
    JOIN "User" "u" ON "u"."id" = "r"."userId" AND "u"."utcDeletedDateTime" IS NULL`;

export default class PinReview {
  // Newest first; the viewer's own review (viewerId, or 0) leads.
  static forPin(pinId: number, viewerId = 0, menuItem = '', query: db.QueryFn = db.query) {
    return query<PinReviewJson & Row>(
      `${SELECT}
        WHERE "r"."pinId" = $1 AND "r"."menuItem" = $3 AND "r"."utcDeletedDateTime" IS NULL
        ORDER BY ("r"."userId" = $2) DESC, "r"."utcUpdatedDateTime" DESC
        LIMIT 100`,
      [pinId, viewerId, menuItem],
    );
  }

  // Average and count over these pins, for the cards on a landing page.
  static async summaries(pinIds: number[], menuItem = ''): Promise<Record<number, ReviewSummary>> {
    if (!pinIds.length) return {};
    const rows = await db.query<{ pinId: number; average: number; count: number }>(
      `SELECT "pinId", ROUND(AVG("stars")::numeric, 1)::float AS "average", COUNT(*)::integer AS "count"
         FROM "PinReview" WHERE "pinId" = ANY($1::integer[]) AND "menuItem" = $2 AND "utcDeletedDateTime" IS NULL GROUP BY "pinId"`,
      [pinIds, menuItem],
    );
    return Object.fromEntries(rows.map((r) => [r.pinId, { average: r.average, count: r.count }]));
  }

  // Dish ratings for all visible menus in one request; whole-pin reviews stay separate.
  static async menuItemSummaries(pinIds: number[]): Promise<Record<number, Record<string, ReviewSummary>>> {
    if (!pinIds.length) return {};
    const rows = await db.query<{ pinId: number; menuItem: string; average: number; count: number }>(
      `SELECT r."pinId", r."menuItem", ROUND(AVG(r."stars")::numeric, 1)::float AS "average", COUNT(*)::integer AS "count"
       FROM "PinReview" r JOIN "User" u ON u."id" = r."userId" AND u."utcDeletedDateTime" IS NULL
       WHERE r."pinId" = ANY($1::integer[]) AND r."menuItem" <> '' AND r."utcDeletedDateTime" IS NULL
       GROUP BY r."pinId", r."menuItem"`, [pinIds],
    );
    return Object.fromEntries(pinIds.map((id) => [id, Object.fromEntries(rows.filter((r) => r.pinId === id).map((r) => [r.menuItem, { average: r.average, count: r.count }]))]));
  }

  static async summary(pinId: number, menuItem = ''): Promise<ReviewSummary> {
    return (await PinReview.summaries([pinId], menuItem))[pinId] ?? { average: null, count: 0 };
  }

  // Adds the reader's review or replaces their earlier one.
  static async save(pinId: number, userId: number, stars: number, comment: string | null, menuItem = '', query: db.QueryFn = db.query) {
    await query(
      `INSERT INTO "PinReview" ("pinId", "userId", "stars", "comment", "menuItem") VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("pinId", "userId", "menuItem") WHERE "utcDeletedDateTime" IS NULL
       DO UPDATE SET "stars" = EXCLUDED."stars", "comment" = EXCLUDED."comment", "utcUpdatedDateTime" = now()`,
      [pinId, userId, stars, comment?.trim() || null, menuItem],
    );
    const [review] = await query<PinReviewJson & Row>(
      `${SELECT} WHERE "r"."pinId" = $1 AND "r"."userId" = $2 AND "r"."menuItem" = $3 AND "r"."utcDeletedDateTime" IS NULL`,
      [pinId, userId, menuItem],
    );
    return review;
  }

  // Soft-deletes the reader's own review (an admin may delete any, by id).
  static async remove(pinId: number, userId: number, menuItem = '') {
    const rows = await db.query(
      `WITH removed AS (UPDATE "PinReview" SET "utcDeletedDateTime" = now()
        WHERE "pinId" = $1 AND "userId" = $2 AND "menuItem" = $3 AND "utcDeletedDateTime" IS NULL RETURNING "id"),
        removed_photos AS (UPDATE "PinPhoto" SET "utcDeletedDateTime" = now()
          WHERE "reviewId" IN (SELECT "id" FROM removed) AND "utcDeletedDateTime" IS NULL RETURNING "id")
        SELECT "id" FROM removed`,
      [pinId, userId, menuItem],
    );
    return rows.length > 0;
  }
}
