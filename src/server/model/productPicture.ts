// A picture for a company's product line that none of its pins has one for
// (0079), shown in the Major products panel. Looked up on the dev machine
// (src/server/productPicture.ts, `npm run products:pictures`); prod only
// stores what a local run sends it (PUT /api/products/pictures).

import * as db from '../db';

export type StoredProductPicture = {
  companyId: number;
  product: string;
  pictureUrl: string | null;
  source: string | null;
  pageUrl: string | null;
  utcCheckedDateTime: string;
};

export type ProductNeedingPicture = { companyId: number; company: string; product: string; checked: boolean };

export default class ProductPicture {
  // { product (lower case): pictureUrl } for a company's found pictures.
  static async forCompany(companyId: number): Promise<Record<string, string>> {
    const rows = await db.query<{ product: string; pictureUrl: string }>(
      `SELECT "product", "pictureUrl" FROM "ProductPicture" WHERE "companyId" = $1 AND "pictureUrl" IS NOT NULL`,
      [companyId],
    );
    return Object.fromEntries(rows.map((r) => [r.product.toLowerCase(), r.pictureUrl]));
  }

  // Product lines none of whose live pins has a picture, each once (its most
  // used spelling), with whether it was looked up already. Never-looked-up
  // first; retry adds the ones looked up and not found.
  static async needing({ companyId, retry = false }: { companyId?: number; retry?: boolean } = {}): Promise<ProductNeedingPicture[]> {
    const rows = await db.query<ProductNeedingPicture>(
      `
    WITH "lines" AS (
      SELECT "Pin"."companyId", lower("PinSentiment"."product"::text) AS "key",
             mode() WITHIN GROUP (ORDER BY "PinSentiment"."product"::text) AS "product",
             bool_or(EXISTS (
               SELECT 1 FROM "PinMedium" AS "pm" JOIN "Medium" AS "m" ON "m"."id" = "pm"."mediumId"
               WHERE "pm"."pinId" = "Pin"."id" AND "pm"."utcDeletedDateTime" IS NULL
                 AND ("m"."thumbName" IS NOT NULL OR ("m"."type" = '1' AND "m"."originalUrl" IS NOT NULL))
             )) AS "pictured"
      FROM "PinSentiment"
        JOIN "Pin" ON "Pin"."id" = "PinSentiment"."pinId"
      WHERE "Pin"."utcDeletedDateTime" IS NULL AND "Pin"."companyId" IS NOT NULL AND "PinSentiment"."product" IS NOT NULL
        AND ($1::integer IS NULL OR "Pin"."companyId" = $1)
      GROUP BY "Pin"."companyId", lower("PinSentiment"."product"::text)
    )
    SELECT "lines"."companyId", "Company"."name" AS "company", "lines"."product", "ProductPicture"."companyId" IS NOT NULL AS "checked"
    FROM "lines"
      JOIN "Company" ON "Company"."id" = "lines"."companyId"
      LEFT JOIN "ProductPicture" ON "ProductPicture"."companyId" = "lines"."companyId" AND lower("ProductPicture"."product"::text) = "lines"."key"
    WHERE NOT "lines"."pictured"
      AND ("ProductPicture"."companyId" IS NULL OR ($2 AND "ProductPicture"."pictureUrl" IS NULL))
    ORDER BY "checked", "Company"."name", "lines"."product"`,
      [companyId ?? null, retry],
    );
    return rows;
  }

  // Whether a user may set a product's picture without being an admin: they
  // pinned something about it.
  static async hasPinned(userId: number, companyId: number, product: string): Promise<boolean> {
    const rows = await db.query(
      `SELECT 1 FROM "PinSentiment" JOIN "Pin" ON "Pin"."id" = "PinSentiment"."pinId"
       WHERE "Pin"."userId" = $1 AND "Pin"."companyId" = $2 AND "PinSentiment"."product" = $3 AND "Pin"."utcDeletedDateTime" IS NULL
       LIMIT 1`,
      [userId, companyId, product],
    );
    return rows.length > 0;
  }

  // A lookup's result, found or not (pictureUrl null), replacing any before.
  static async set(row: { companyId: number; product: string; pictureUrl: string | null; source?: string | null; pageUrl?: string | null }) {
    await db.query(
      `
    INSERT INTO "ProductPicture" ("companyId", "product", "pictureUrl", "source", "pageUrl", "utcCheckedDateTime")
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT ("companyId", "product") DO UPDATE SET
      "pictureUrl" = EXCLUDED."pictureUrl", "source" = EXCLUDED."source", "pageUrl" = EXCLUDED."pageUrl",
      "utcCheckedDateTime" = EXCLUDED."utcCheckedDateTime"`,
      [row.companyId, row.product, row.pictureUrl, row.source ?? null, row.pageUrl ?? null],
    );
  }

  static async getAll(): Promise<StoredProductPicture[]> {
    const rows = await db.query<Omit<StoredProductPicture, 'utcCheckedDateTime'> & { utcCheckedDateTime: Date }>(
      `SELECT "companyId", "product", "pictureUrl", "source", "pageUrl", "utcCheckedDateTime" FROM "ProductPicture" ORDER BY "companyId", "product"`,
    );
    return rows.map((r) => ({ ...r, utcCheckedDateTime: new Date(r.utcCheckedDateTime).toISOString() }));
  }

  // From seedProductPictures.json; rows for companies that are not there are skipped.
  static async restore(rows: StoredProductPicture[]) {
    for (const row of rows) {
      await db.query(
        `
      INSERT INTO "ProductPicture" ("companyId", "product", "pictureUrl", "source", "pageUrl", "utcCheckedDateTime")
      SELECT $1, $2, $3, $4, $5, $6 WHERE EXISTS (SELECT 1 FROM "Company" WHERE "id" = $1)
      ON CONFLICT ("companyId", "product") DO NOTHING`,
        [row.companyId, row.product, row.pictureUrl, row.source, row.pageUrl, row.utcCheckedDateTime],
      );
    }
  }
}
