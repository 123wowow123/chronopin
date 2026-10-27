// Clear a specifically researched, unsupported publication date. The ordinary
// review merge intentionally preserves known dates when incoming dates are null.
// npx tsx scripts/products/replayReviewDateClears.ts --file <catalog.json>
import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { REVIEW_TABLES, type PinReview, type ReviewTable } from '@/lib/pinReviews';
import { reviewPublicationDay } from '@/lib/reviewPublicationDay';
import { adminDbRequest, prodBase, reviewResearchRequest } from '@/server/jobs/pinApi';
import { REVIEW_ENDPOINTS } from '@/server/jobs/reviewResearch';

type Entry = {
  table: ReviewTable;
  pinSourceUrl: string;
  url: string;
  expectedReview: PinReview;
  reason: string;
};
const catalogs: Partial<Record<ReviewTable, string>> = {
  PinCarPerf: 'scripts/products/carPerf.json',
  PinTaste: 'scripts/products/taste.json',
  PinDining: 'scripts/restaurants/diningRubric.json',
};

async function run() {
  const { values } = parseArgs({ options: { file: { type: 'string' } } });
  if (!values.file) throw new Error('--file is required');
  const { entries } = JSON.parse(readFileSync(values.file, 'utf8')) as { entries: Entry[] };
  if (!Array.isArray(entries) || !entries.length) throw new Error('No date corrections');
  for (const entry of entries) {
    const originalDate = entry.expectedReview?.publishedDate;
    const expectedDate = typeof originalDate === 'string'
      ? reviewPublicationDay([originalDate], new Date().toISOString().slice(0, 10)) : null;
    if (!(REVIEW_TABLES as readonly string[]).includes(entry.table)
      || !entry.url.startsWith('https://') || !entry.reason.trim()
      || entry.expectedReview.url !== entry.url || !entry.expectedReview.title
      || !entry.expectedReview.quote || !expectedDate
      || expectedDate !== entry.expectedReview.publishedDate) throw new Error('Invalid researched date clear');
    const pins = await db.query<{ id: number }>(
      'SELECT "id" FROM "Pin" WHERE "sourceUrl"=$1 AND "utcDeletedDateTime" IS NULL', [entry.pinSourceUrl],
    );
    if (pins.length !== 1) throw new Error('Local pin identity missing or ambiguous');
    const targets = [{ pinId: pins[0].id, production: false }];
    if (prodBase()) {
      const remote = await adminDbRequest<{ rows: { id: number }[] }>(
        'GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(entry.pinSourceUrl)}&utcDeletedDateTime.null=true&limit=2`,
      );
      if (remote.rows.length !== 1) throw new Error('Production pin identity missing or ambiguous');
      targets.push({ pinId: remote.rows[0].id, production: true });
    }
    const prepared = [];
    for (const target of targets) {
      const route = `/api/pins/${target.pinId}/${REVIEW_ENDPOINTS[entry.table]}`;
      const row = await reviewResearchRequest<Record<string, any>>('GET', route, undefined, target.production);
      const review = (row?.reviews as PinReview[] | undefined)?.find((r) => r.url === entry.url);
      if (!row || row.source === 'hand' || !review
        || review.title !== entry.expectedReview.title || review.quote !== entry.expectedReview.quote
        || (review.publishedDate !== null && review.publishedDate !== expectedDate)) {
        throw new Error('Citation changed since research; inspect before clearing its date');
      }
      prepared.push({ ...target, route, row });
    }
    for (const target of prepared) {
      const fresh = await reviewResearchRequest('GET', target.route, undefined, target.production);
      if (JSON.stringify(fresh) !== JSON.stringify(target.row)) throw new Error('Concurrent rubric change; stopped');
      const reviews = (target.row.reviews as PinReview[]).map((r) => r.url === entry.url ? { ...r, publishedDate: null } : r);
      if (JSON.stringify(reviews) !== JSON.stringify(target.row.reviews)) {
        await reviewResearchRequest('PUT', target.route, { ...target.row, reviews }, target.production);
      }
      const saved = await reviewResearchRequest<Record<string, any>>('GET', target.route, undefined, target.production);
      if (JSON.stringify(saved.reviews) !== JSON.stringify(reviews)) throw new Error('Date-clear readback failed');
      for (const [key, value] of Object.entries(target.row)) {
        if (!['reviews', 'checkedAt'].includes(key) && JSON.stringify(saved[key]) !== JSON.stringify(value)) {
          throw new Error(`Unrelated field changed: ${key}`);
        }
      }
      console.log(JSON.stringify({ table: entry.table, pinId: target.pinId, production: target.production, publishedDate: null }));
    }
    const file = catalogs[entry.table];
    if (file) {
      const catalog = JSON.parse(readFileSync(file, 'utf8'));
      for (const row of catalog) if (row.pinId === pins[0].id) {
        for (const review of row.reviews ?? []) if (review.url === entry.url) review.publishedDate = null;
      }
      writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
    }
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.closeConnection());
