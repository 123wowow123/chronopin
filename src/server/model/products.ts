import * as db from '../db';
import { pinConfidenceOf } from './pins';

// The product pins the /products landing page shelves: live pins the timeline
// would show (minConfidence is its floor, null for none) that name one
// purchasable product (Pin.productName, 0085) and carry one of a shelf's
// category or tag. A film or a restaurant also has a productName, so those tags
// are left out. A pin with a stored listing (a Merchant row, found or checked
// by a curator or the scrape) goes first, then the newest. Only this year's
// products: released so far or still to come before the year ends.
const NOT_GOODS = ['Restaurant', 'Restaurant Opening', 'Top Restaurants', 'Movie'];

export type ProductBlurb = { blurb: string; rating: { score: number; max: number; source: string; url: string | null } | null };

export default class Products {
  static async shelfIds(category: string, limit: number, minConfidence: number | null): Promise<number[]> {
    // One pin per product: a launch has a pin for each stage (announced, on
    // sale), and the one with a stored listing, then the newest, stands for it.
    const rows = await db.query<{ id: number }>(
      `
      SELECT "id" FROM (
        SELECT DISTINCT ON (lower("p"."productName")) "p"."id", "p"."utcStartDateTime",
          EXISTS (SELECT 1 FROM "Merchant" AS "m" WHERE "m"."pinId" = "p"."id") AS "listed"
        FROM "Pin" AS "p"
        WHERE "p"."utcDeletedDateTime" IS NULL
          AND ($2::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $2) >= $2)
          AND nullif("p"."productName", '') IS NOT NULL
          AND "p"."utcStartDateTime" >= date_trunc('year', now()) AND "p"."utcStartDateTime" < date_trunc('year', now()) + interval '1 year'
          AND EXISTS (SELECT 1 FROM "PinTagView" AS "c" WHERE "c"."pinId" = "p"."id" AND "c"."kind" <> 'reserved' AND "c"."name" = $1::citext)
          AND NOT EXISTS (SELECT 1 FROM "PinTagView" AS "x" WHERE "x"."pinId" = "p"."id" AND "x"."name" = ANY($4::citext[]))
        ORDER BY lower("p"."productName"), "listed" DESC, "p"."utcStartDateTime" DESC, "p"."id" DESC
      ) AS "one"
      ORDER BY "listed" DESC, "utcStartDateTime" DESC, "id" DESC
      LIMIT $3::integer`,
      [category, minConfidence, limit, NOT_GOODS],
    );
    return rows.map((r) => r.id);
  }

  // pinId -> the pin's "why it is good" line (ProductBlurb, 0142), for those that have one.
  static async blurbs(ids: number[]): Promise<Map<number, ProductBlurb>> {
    if (!ids.length) return new Map();
    const rows = await db.query<{ pinId: number; blurb: string; score: string | null; max: string | null; source: string | null; url: string | null }>(
      `SELECT "pinId", "blurb", "ratingScore" AS "score", "ratingMax" AS "max", "ratingSource" AS "source", "ratingUrl" AS "url" FROM "ProductBlurb" WHERE "pinId" = ANY($1::integer[])`,
      [ids],
    );
    return new Map(
      rows.map((r) => [r.pinId, { blurb: r.blurb, rating: r.score != null && r.max != null && r.source ? { score: Number(r.score), max: Number(r.max), source: r.source, url: r.url } : null }]),
    );
  }

  // A product's line and rating, added or replaced. Only a pin the page
  // shelves may have one (the weekly job writes through this).
  static async saveBlurb(row: { pinId: number; blurb: string; sourceUrl?: string | null; rating?: { score: number; max: number; source: string; url?: string | null } | null }) {
    const blurb = row.blurb.trim();
    if (!blurb || blurb.length > 400) throw new Error('A blurb is 1 to 400 characters');
    const r = row.rating ?? null;
    if (r && !(r.max > 0 && r.score >= 0 && r.score <= r.max && r.source.trim())) throw new Error('A rating needs a score from 0 to its maximum, and its source');
    await db.query(
      `INSERT INTO "ProductBlurb" ("pinId", "blurb", "sourceUrl", "ratingScore", "ratingMax", "ratingSource", "ratingUrl") VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT ("pinId") DO UPDATE SET "blurb" = $2, "sourceUrl" = $3, "ratingScore" = $4, "ratingMax" = $5, "ratingSource" = $6, "ratingUrl" = $7, "updatedAt" = now()`,
      [row.pinId, blurb, row.sourceUrl ?? null, r?.score ?? null, r?.max ?? null, r?.source.trim() ?? null, r?.url ?? null],
    );
  }

  // The products the page shelves that need a look: no line yet (new to the
  // page) or a line older than staleDays.
  static async needingReview(shelves: string[], perShelf: number, staleDays: number, minConfidence: number | null) {
    const out: { shelf: string; pinId: number; productName: string; title: string; description: string | null; company: string | null; blurb: string | null; blurbDays: number | null; rating: string | null }[] = [];
    for (const shelf of shelves) {
      const ids = await Products.shelfIds(shelf, perShelf, minConfidence);
      if (!ids.length) continue;
      const rows = await db.query<{ id: number; productName: string; title: string; description: string | null; company: string | null; blurb: string | null; days: number | null; rating: string | null }>(
        `SELECT "p"."id", "p"."productName", "p"."title", "p"."description", "c"."name"::text AS "company", "b"."blurb",
                extract(day FROM now() - "b"."updatedAt")::int AS "days",
                CASE WHEN "b"."ratingScore" IS NULL THEN NULL ELSE "b"."ratingScore" || '/' || "b"."ratingMax" || ' ' || "b"."ratingSource" END AS "rating"
         FROM "Pin" AS "p" LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId" LEFT JOIN "ProductBlurb" AS "b" ON "b"."pinId" = "p"."id"
         WHERE "p"."id" = ANY($1::integer[]) AND ("b"."pinId" IS NULL OR "b"."updatedAt" < now() - make_interval(days => $2::integer))`,
        [ids, staleDays],
      );
      out.push(...rows.map((r) => ({ shelf, pinId: r.id, productName: r.productName, title: r.title, description: r.description, company: r.company, blurb: r.blurb, blurbDays: r.days, rating: r.rating })));
    }
    return out;
  }
}
