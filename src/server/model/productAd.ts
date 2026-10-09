import { adProblem, asinOf, listingUrl, MIN_AD_RATING } from '@/lib/adQuality';
import * as db from '../db';
import { readAmazonListing } from '../listingPrice';

export type ProductAdRow = {
  id: number;
  asin: string;
  url: string;
  title: string;
  brand: string | null;
  price: number | null;
  rating: number | null;
  reviewCount: number | null;
  image: string | null;
  urgency: string | null;
  categories: string[];
  status: 'ok' | 'broken';
};

function touched() {
  const held = (globalThis as any).__chronopinAds;
  if (held) held.inventory = null;
}

export default class ProductAd {
  static list(): Promise<ProductAdRow[]> {
    return db.query<ProductAdRow>('SELECT * FROM "ProductAd" ORDER BY "id"');
  }

  static async add(link: string, categories: string[] = []) {
    const asin = asinOf(link);
    if (!asin) return { rejected: 'Not an amazon.com product link (/dp/<ASIN>).' };
    const url = listingUrl(asin);
    const listing = await readAmazonListing(url);
    if ('gone' in listing) return { rejected: 'Amazon has no such listing (404).' };
    if ('unknown' in listing) return { rejected: `The listing could not be read (${listing.unknown}).` };
    // Owner selected this Shark FlexStyle at 4.2 stars on October 8, 2026.
    // Keep its exception through refreshes without lowering the general bar.
    const minRating = asin === 'B0B89P16MC' ? 4.2 : MIN_AD_RATING;
    const problem = adProblem(listing, minRating) ?? (!listing.image ? 'no product image on the listing' : null);
    if (problem) return { rejected: problem };
    const [added] = await db.query<ProductAdRow>(
      `INSERT INTO "ProductAd" ("asin", "url", "title", "brand", "price", "rating", "reviewCount", "image", "urgency", "categories")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT ("asin") DO UPDATE SET "title" = EXCLUDED."title", "brand" = EXCLUDED."brand",
         "price" = EXCLUDED."price", "rating" = EXCLUDED."rating", "reviewCount" = EXCLUDED."reviewCount",
         "image" = EXCLUDED."image", "urgency" = EXCLUDED."urgency", "categories" = EXCLUDED."categories",
         "status" = 'ok', "problem" = NULL, "checkedDateTime" = now()
       RETURNING *`,
      [asin, url, listing.title.slice(0, 300), listing.brand?.slice(0, 120) ?? null,
        listing.price, listing.rating, listing.reviewCount, listing.image, listing.urgency ?? null, categories],
    );
    touched();
    return { added };
  }

  // Reuse the listing reader and quality gate. Unreadable pages preserve the
  // previous facts; unavailable or poorly reviewed listings stop serving.
  static async check({ all = false, limit = 40 }: { all?: boolean; limit?: number } = {}) {
    const due = await db.query<ProductAdRow>(
      `SELECT * FROM "ProductAd" WHERE $1::boolean OR "checkedDateTime" < now() - interval '11 hours'
       ORDER BY "checkedDateTime" LIMIT $2`, [all, limit],
    );
    let ok = 0;
    let unread = 0;
    const broken: { id: number; problem: string }[] = [];
    for (const row of due) {
      const result = await ProductAd.add(row.url, row.categories);
      if ('added' in result) { ok++; continue; }
      if (result.rejected.startsWith('The listing could not be read')) { unread++; continue; }
      await db.query(`UPDATE "ProductAd" SET "status" = 'broken', "problem" = $2, "checkedDateTime" = now() WHERE "id" = $1`, [row.id, result.rejected]);
      broken.push({ id: row.id, problem: result.rejected });
    }
    if (due.length) touched();
    return { checked: due.length, ok, unread, broken };
  }
}
