// Remove specifically researched, ineligible citations without replacing axes,
// authors or other reviews. Preflight both environments and refuse changed quotes.
// npx tsx scripts/products/replayReviewExclusions.ts --file <catalog.json>
import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { adminDbRequest, prodBase, reviewResearchRequest } from '@/server/jobs/pinApi';
import { REVIEW_ENDPOINTS } from '@/server/jobs/reviewResearch';
import { REVIEW_TABLES, type PinReview, type ReviewTable } from '@/lib/pinReviews';
import { findReviewCatalogEntry } from './reviewCatalog';

const { values } = parseArgs({ options: { file: { type: 'string' } } });
if (!values.file) throw new Error('--file is required');
type Entry = { table: ReviewTable; pinSourceUrl: string; url: string; reason: string; expectedReview: PinReview };
const entries: Entry[] = JSON.parse(readFileSync(values.file, 'utf8')).entries;
const catalogs: Partial<Record<ReviewTable, string>> = {
  PinCarPerf: 'scripts/products/carPerf.json', PinTaste: 'scripts/products/taste.json', PinDining: 'scripts/restaurants/diningRubric.json',
};
async function run() {
  for (const entry of entries) {
    if (!(REVIEW_TABLES as readonly string[]).includes(entry.table) || !entry.reason.trim() || entry.expectedReview.url !== entry.url) throw new Error('Invalid researched exclusion');
    const pins = await db.query<{ id: number }>('SELECT "id" FROM "Pin" WHERE "sourceUrl"=$1 AND "utcDeletedDateTime" IS NULL', [entry.pinSourceUrl]);
    if (pins.length !== 1) throw new Error('Local sourceUrl missing or ambiguous');
    const targets = [{ pinId: pins[0].id, production: false }];
    if (prodBase()) {
      const remote = await adminDbRequest<{ rows: { id: number }[] }>('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(entry.pinSourceUrl)}&utcDeletedDateTime.null=true&limit=2`);
      if (remote.rows.length !== 1) throw new Error('Production sourceUrl missing or ambiguous');
      targets.push({ pinId: remote.rows[0].id, production: true });
    }
    const prepared = [];
    for (const target of targets) {
      const route = `/api/pins/${target.pinId}/${REVIEW_ENDPOINTS[entry.table]}`;
      const row = await reviewResearchRequest<Record<string, any>>('GET', route, undefined, target.production);
      if (!row || row.source === 'hand') throw new Error('Missing rubric or hand-edited rubric');
      const review = (row.reviews as PinReview[]).find((r) => r.url === entry.url);
      if (review && (review.quote !== entry.expectedReview.quote || review.title !== entry.expectedReview.title)) throw new Error('Citation changed since research; inspect before excluding');
      prepared.push({ ...target, route, row, found: !!review });
    }
    for (const target of prepared) {
      if (target.found) await reviewResearchRequest('PUT', target.route, { ...target.row, reviews: target.row.reviews.filter((r: PinReview) => r.url !== entry.url) }, target.production);
      const saved = await reviewResearchRequest<Record<string, any>>('GET', target.route, undefined, target.production);
      const expectedReviews = target.row.reviews.filter((r: PinReview) => r.url !== entry.url);
      if (JSON.stringify(saved.reviews) !== JSON.stringify(expectedReviews)) throw new Error('Exclusion or remaining-review read-back failed');
      for (const [key, value] of Object.entries(target.row)) {
        if (['reviews', 'checkedAt'].includes(key)) continue;
        if (JSON.stringify(saved[key]) !== JSON.stringify(value)) throw new Error(`Unrelated field changed: ${key}`);
      }
      console.log(JSON.stringify({ table: entry.table, pinId: target.pinId, production: target.production, excluded: entry.url, reviews: saved.reviews.length }));
    }
    const file = catalogs[entry.table];
    if (file) {
      const catalog = JSON.parse(readFileSync(file, 'utf8')) as any[];
      const row = findReviewCatalogEntry(catalog, entry.pinSourceUrl, prepared[0].row.sourceUrl);
      if (row) {
        row.pinSourceUrl = entry.pinSourceUrl;
        row.reviews = prepared[0].row.reviews.filter((r: PinReview) => r.url !== entry.url);
      }
      writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
    }
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.closeConnection());
