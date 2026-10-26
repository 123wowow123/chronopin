// Replay an opened-source research catalog through native pin APIs on both
// environments. Pin ids are resolved by sourceUrl, never assumed portable.
// npx tsx scripts/products/replayResearchedReviews.ts --file <catalog.json>
import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { saveResearchedReviews } from '@/server/jobs/reviewResearch';
import { reviewResearchRequest } from '@/server/jobs/pinApi';
import type { PinReview, ReviewTable } from '@/lib/pinReviews';
import { sourceKey } from '@/server/model/source';

const { values } = parseArgs({ options: { file: { type: 'string' }, references: { type: 'boolean' }, pin: { type: 'string' } } });
if (!values.file) throw new Error('--file is required');
type Entry = { table: ReviewTable; pinSourceUrl: string; reviews: PinReview[]; basis: string };
const entries: Entry[] = JSON.parse(readFileSync(values.file, 'utf8')).entries;
const catalogFiles: Partial<Record<ReviewTable, string>> = {
  PinTaste: 'scripts/products/taste.json', PinCarPerf: 'scripts/products/carPerf.json', PinDining: 'scripts/restaurants/diningRubric.json',
};
async function run() {
  let saved = 0, failed = 0;
  for (const entry of entries) {
    try {
      const pins = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL`, [entry.pinSourceUrl]);
      if (pins.length !== 1) throw new Error('Local sourceUrl is missing or ambiguous');
      const pinId = pins[0].id;
      if (values.pin && pinId !== Number(values.pin)) continue;
      const result = await saveResearchedReviews(entry.table, pinId, entry.reviews, entry.basis);
      if (values.references) {
        for (const target of result.saved) {
          const references = entry.reviews.map((r) => ({ url: r.url, title: r.title, publishedDate: r.publishedDate, confidence: 70, reasoning: 'Independent review of this exact work/product, supporting its critical reception; this reference does not independently establish the event date.' }));
          const linked = await reviewResearchRequest<{ pin: { references: { url: string }[] } }>('POST', `/api/pins/${target.pinId}/references`, { references }, target.production);
          if (references.some((r) => !linked.pin.references.some((s) => s.url === r.url))) throw new Error('Reference read-back verification failed');
          // Adding references does not synchronously register Source/PinSource
          // in every deployed version. Register only these verified links;
          // preserve existing source text and ready wikis.
          for (const r of entry.reviews) {
            const key = sourceKey(r.url);
            if (!key) throw new Error('Review source cannot be keyed');
            const found = await reviewResearchRequest<{ rows: { id: number }[] }>('GET', `/api/admin/db/Source?urlKey=${encodeURIComponent(key)}&limit=2`, undefined, target.production);
            if (found.rows.length > 1) throw new Error('Ambiguous source key');
            let source = found.rows[0];
            if (!source) {
              try {
                source = (await reviewResearchRequest<{ rows: { id: number }[] }>('POST', '/api/admin/db/Source', { urlKey: key, url: r.url, kind: 'web', title: r.title }, target.production)).rows[0];
              } catch (error) {
                // Reference background work can register the same URL between
                // the read and insert. Re-read instead of overwriting it.
                source = (await reviewResearchRequest<{ rows: { id: number }[] }>('GET', `/api/admin/db/Source?urlKey=${encodeURIComponent(key)}&limit=1`, undefined, target.production)).rows[0];
                if (!source) throw error;
              }
            }
            if (!source) throw new Error('Source registration failed');
            await reviewResearchRequest('POST', '/api/admin/db/PinSource?upsert=1', { pinId: target.pinId, sourceId: source.id, role: 'reference', utcRemovedDateTime: null }, target.production);
          }
          const wikis = entry.reviews.map((r) => ({ url: r.url, title: r.title, generatedBy: 'codex/session', text: r.quote,
            wiki: { title: r.title!, summary: 'Independent critical review; excerpt and publication date verified.',
              body: `# Review evidence\n\nPublished: ${r.publishedDate ?? 'Not published'}. Checked: 2026-10-26.\n\n> ${r.quote}\n\nSource: ${r.url}\n\nSupports critical reception; does not independently establish the pin event date. Sentiment is an editorial estimate from the cited verdict.`, tags: ['review', 'critical reception'] } }));
          const written = await reviewResearchRequest<{ results: { status: string; url: string }[] }>('POST', '/api/admin/source-wikis', { wikis }, target.production);
          if (written.results.length !== wikis.length || written.results.some((r) => !['saved', 'unchanged'].includes(r.status))) throw new Error(`Source wiki verification failed: ${JSON.stringify(written.results)}`);
        }
      }
      const file = catalogFiles[entry.table];
      if (file) {
        const catalog = JSON.parse(readFileSync(file, 'utf8')) as any[];
        let changed = false;
        for (const item of catalog) {
          if (item?.pinId !== pinId) continue;
          const incoming = new Map(entry.reviews.map((r) => [r.url, r]));
          item.reviews = (item.reviews ?? []).map((r: PinReview) => {
            const fresh = incoming.get(r.url);
            incoming.delete(r.url);
            return fresh ?? r;
          });
          item.reviews.push(...incoming.values());
          changed = true;
        }
        if (changed) writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
      }
      saved++;
      console.log(JSON.stringify(result));
    } catch (error) { failed++; console.error(`${entry.table} ${entry.pinSourceUrl}: ${(error as Error).message}`); }
  }
  console.log(`${saved} verified pin/table updates, ${failed} failures`);
  if (failed) process.exitCode = 1;
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.closeConnection());
