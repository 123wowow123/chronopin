// Read-only inventory of the sentiment graph's review coverage.
// npx tsx scripts/products/reviewAudit.ts --output tmp/review-audit.json
import '../env';
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { REVIEW_TABLES, type PinReview } from '@/lib/pinReviews';

async function run() {
  const tables = [];
  for (const table of REVIEW_TABLES) {
    const rows = await db.query<{ pinId: number; title: string; sourceUrl: string | null; reviews: PinReview[] }>(
      `SELECT t."pinId", p."title", p."sourceUrl", t."reviews" FROM "${table}" t JOIN "Pin" p ON p."id" = t."pinId" WHERE p."utcDeletedDateTime" IS NULL ORDER BY t."pinId"`,
    );
    const reviews = rows.flatMap((r) => r.reviews);
    tables.push({ table, pins: rows.length, reviews: reviews.length,
      minimum: table === 'PinTaste' ? 1 : 3,
      belowMinimum: rows.filter((r) => r.reviews.length < (table === 'PinTaste' ? 1 : 3)).length,
      belowThree: rows.filter((r) => r.reviews.length < 3),
      undated: rows.flatMap((r) => r.reviews.filter((v) => !v.publishedDate).map((review) => ({ pinId: r.pinId, title: r.title, review }))),
      unscored: reviews.filter((r) => r.quote && r.publishedDate && r.sentiment == null).length });
  }
  const candidates = await db.query(
    `SELECT p."id", p."title", p."sourceUrl", p."utcStartDateTime", array_to_json(ARRAY(SELECT t."name" FROM "PinTag" t WHERE t."pinId" = p."id" AND t."kind" = 'category')) AS categories
     FROM "Pin" p WHERE p."utcDeletedDateTime" IS NULL AND p."utcStartDateTime" <= now()
       AND EXISTS (SELECT 1 FROM "PinTag" t WHERE t."pinId" = p."id" AND t."name" IN ('Movie','TV','Music','Computing','Fashion','Gaming'))
       AND NOT EXISTS (SELECT 1 FROM "PinCriticReview" c WHERE c."pinId" = p."id" AND jsonb_array_length(c."reviews") >= 3)
     ORDER BY p."utcStartDateTime" DESC, p."id"`,
  );
  const { values } = parseArgs({ options: { output: { type: 'string' } } });
  const report = JSON.stringify({ checkedAt: new Date().toISOString(), tables, candidates }, null, 2) + '\n';
  if (values.output) writeFileSync(values.output, report);
  else console.log(report);
}
run().catch((err) => { console.error(err); process.exitCode = 1; }).finally(() => db.closeConnection());
