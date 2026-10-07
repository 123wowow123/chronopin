// Read-only audit of every live pin against current US inventory. Relevance
// coverage depends on available ads; selection must prioritize every match
// while retaining full counts and variety. Does not record impressions or clicks.
import '../env';
import assert from 'node:assert/strict';
import * as db from '@/server/db';
import Ad from '@/server/model/ad';
import { adAllowed, adCategory, pickAds, productKey, relatedness, type AdContext } from '@/lib/ads';

async function run() {
  const inventory = (await Ad.inventory()).ads.filter((ad) => ad.store === 'US' && !ad.holiday);
  const pins = await db.query<NonNullable<AdContext['pin']>>(`
    SELECT p."id", p."title", c."name"::text AS "company",
      coalesce(array_agg(t."name"::text) FILTER (WHERE t."kind" = 'category'), '{}') AS "categories",
      coalesce(array_agg(t."name"::text) FILTER (WHERE t."kind" <> 'category'), '{}') AS "tags"
    FROM "Pin" p LEFT JOIN "Company" c ON c."id" = p."companyId"
    LEFT JOIN "PinTag" t ON t."pinId" = p."id"
    WHERE p."utcDeletedDateTime" IS NULL
    GROUP BY p."id", c."name" ORDER BY p."id"`);
  let withMatches = 0;
  const coverage = new Map<string, { total: number; matched: number }>();
  for (const pin of pins) {
    const ctx: AdContext = { pin, preference: null, age: null };
    const matches = inventory.filter((ad) => adAllowed(ad, ctx) && ad.weight > 0 && relatedness(ad, pin) > 0);
    if (matches.length) withMatches++;
    for (const category of pin.categories) {
      const tally = coverage.get(category) ?? { total: 0, matched: 0 };
      tally.total++;
      if (matches.length) tally.matched++;
      coverage.set(category, tally);
    }
    for (const n of [2, 7]) {
      const picked = pickAds(inventory, ctx, n, new Set(), () => 0.5);
      const eligible = inventory.filter((ad) => adAllowed(ad, ctx) && ad.weight > 0);
      const uniqueProducts = new Set(eligible.map(productKey));
      assert.equal(picked.length, Math.min(n, uniqueProducts.size), `Reduced ad count: pin ${pin.id}`);
      if (matches.length) assert.ok(picked.length && relatedness(picked[0], pin) > 0, `No relevant first ad: pin ${pin.id}`);
      const counts = new Map<string, number>();
      for (const ad of picked) counts.set(adCategory(ad), (counts.get(adCategory(ad)) ?? 0) + 1);
      const availableCategories = new Set(eligible.map(adCategory));
      if (picked.length > 1 && availableCategories.size > 1) assert.ok(counts.size > 1, `No variety: pin ${pin.id}`);
    }
  }
  console.log(JSON.stringify({ pinsChecked: pins.length, withRelevantInventory: withMatches, withoutRelevantInventory: pins.length - withMatches, categories: Object.fromEntries([...coverage].sort(([a], [b]) => a.localeCompare(b))) }, null, 2));
}

run().catch((err) => { console.error(err); process.exitCode = 1; }).finally(() => db.closeConnection());
