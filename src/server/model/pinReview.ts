import * as db from '../db';
import type { Row } from '../db';
import type { PinReviewJson, ReviewSummary } from '@/lib/userReviews';

// Reader reviews on pins (0209). Static queries, as PinPhoto's are.

const SELECT = `
  SELECT "r"."id", "r"."pinId", "r"."userId", "u"."userName", "u"."pictureUrl", "r"."stars", "r"."comment",
         ("r"."userId" = $2) AS "mine", "r"."utcCreatedDateTime", "r"."utcUpdatedDateTime"
    FROM "PinReview" "r"
    JOIN "User" "u" ON "u"."id" = "r"."userId" AND "u"."utcDeletedDateTime" IS NULL`;

export default class PinReview {
  // Newest first; the viewer's own review (viewerId, or 0) leads.
  static forPin(pinId: number, viewerId = 0) {
    return db.query<PinReviewJson & Row>(
      `${SELECT}
        WHERE "r"."pinId" = $1 AND "r"."utcDeletedDateTime" IS NULL
        ORDER BY ("r"."userId" = $2) DESC, "r"."utcUpdatedDateTime" DESC
        LIMIT 100`,
      [pinId, viewerId],
    );
  }

  // Average and count over these pins, for the cards on a landing page.
  static async summaries(pinIds: number[]): Promise<Record<number, ReviewSummary>> {
    if (!pinIds.length) return {};
    const rows = await db.query<{ pinId: number; average: number; count: number }>(
      `SELECT "pinId", ROUND(AVG("stars")::numeric, 1)::float AS "average", COUNT(*)::integer AS "count"
         FROM "PinReview" WHERE "pinId" = ANY($1::integer[]) AND "utcDeletedDateTime" IS NULL GROUP BY "pinId"`,
      [pinIds],
    );
    return Object.fromEntries(rows.map((r) => [r.pinId, { average: r.average, count: r.count }]));
  }

  static async summary(pinId: number): Promise<ReviewSummary> {
    return (await PinReview.summaries([pinId]))[pinId] ?? { average: null, count: 0 };
  }

  // Adds the reader's review or replaces their earlier one.
  static async save(pinId: number, userId: number, stars: number, comment: string | null) {
    await db.query(
      `INSERT INTO "PinReview" ("pinId", "userId", "stars", "comment") VALUES ($1, $2, $3, $4)
       ON CONFLICT ("pinId", "userId") WHERE "utcDeletedDateTime" IS NULL
       DO UPDATE SET "stars" = EXCLUDED."stars", "comment" = EXCLUDED."comment", "utcUpdatedDateTime" = now()`,
      [pinId, userId, stars, comment?.trim() || null],
    );
    const [review] = await db.query<PinReviewJson & Row>(
      `${SELECT} WHERE "r"."pinId" = $1 AND "r"."userId" = $2 AND "r"."utcDeletedDateTime" IS NULL`,
      [pinId, userId],
    );
    return review;
  }

  // Soft-deletes the reader's own review (an admin may delete any, by id).
  static async remove(pinId: number, userId: number) {
    const rows = await db.query(
      `UPDATE "PinReview" SET "utcDeletedDateTime" = now()
        WHERE "pinId" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL RETURNING "id"`,
      [pinId, userId],
    );
    return rows.length > 0;
  }
}
