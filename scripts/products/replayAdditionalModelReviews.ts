// Append researched citations to manually curated model rubrics. All existing
// citations, scores, basis and provenance remain unchanged. No estimate replaces
// a hand-set profile; same-URL edits are refused, including on replay.
import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import * as db from '@/server/db';
import { adminDbRequest, reviewResearchRequest } from '@/server/jobs/pinApi';
import { reviewsProblem, type PinReview } from '@/lib/pinReviews';
import { reviewPublicationDay } from '@/lib/reviewPublicationDay';

const { values } = parseArgs({ options: { file: { type: 'string' }, output: { type: 'string' } } });
type Entry = { table: string; pinSourceUrl: string; reviews: PinReview[] };
async function run() {
  if (!values.file) throw new Error('--file required');
  const entries = JSON.parse(readFileSync(values.file, 'utf8')).entries as Entry[];
  const prepared = [];
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  for (const entry of entries) {
    if (entry.table !== 'PinLlmPerf' || !entry.pinSourceUrl.startsWith('https://')) throw new Error('Expected exact model-rubric identity');
    const incoming = reviewsProblem(entry.reviews, { max: 6, maxQuote: 300 });
    if (typeof incoming === 'string') throw new Error(incoming);
    if (!incoming.length || incoming.some((r) => !r.url.startsWith('https://') || !r.title || !r.quote || r.sentiment == null
      || (r.publishedDate && reviewPublicationDay([r.publishedDate], today) !== r.publishedDate))) throw new Error('Invalid researched evidence');
    const local = await db.query<{ id: number }>('SELECT id FROM "Pin" WHERE "sourceUrl"=$1 AND "utcDeletedDateTime" IS NULL', [entry.pinSourceUrl]);
    const remote = await adminDbRequest<{ rows: { id: number }[] }>('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(entry.pinSourceUrl)}&utcDeletedDateTime.null=true&limit=2`);
    if (local.length !== 1 || remote.rows.length !== 1) throw new Error('Missing or ambiguous pin identity');
    for (const [pinId, production] of [[local[0].id, false], [remote.rows[0].id, true]] as const) {
      const route = `/api/pins/${pinId}/llm-performance`;
      const row = await reviewResearchRequest<Record<string, any>>('GET', route, undefined, production);
      if (!row || row.source !== 'hand') throw new Error('Expected manually curated row');
      const reviews: PinReview[] = [...row.reviews];
      for (const review of incoming) {
        const existing = reviews.find((r) => r.url === review.url);
        if (existing && !isDeepStrictEqual(existing, review)) throw new Error('Would replace a manually curated citation');
        if (!existing) reviews.push(review);
      }
      if (reviews.length > 6) throw new Error('Review limit exceeded');
      prepared.push({ pinId, production, route, row, reviews });
    }
  }
  const results = [];
  for (const target of prepared) {
    const fresh = await reviewResearchRequest('GET', target.route, undefined, target.production);
    if (!isDeepStrictEqual(fresh, target.row)) throw new Error('Concurrent change; stopped');
    if (!isDeepStrictEqual(target.reviews, target.row.reviews)) {
      await reviewResearchRequest('PUT', target.route, { ...target.row, reviews: target.reviews }, target.production);
    }
    const saved = await reviewResearchRequest<Record<string, any>>('GET', target.route, undefined, target.production);
    for (const [key, value] of Object.entries({ ...target.row, reviews: target.reviews })) {
      if (key !== 'checkedAt' && !isDeepStrictEqual(saved[key], value)) throw new Error(`Readback failed: ${key}`);
    }
    results.push({ pinId: target.pinId, production: target.production, reviews: saved.reviews.length, originalCitationsPreserved: true, otherFieldsPreserved: true });
  }
  if (values.output) writeFileSync(values.output, JSON.stringify(results, null, 2) + '\n');
  console.log(`${results.length} additive model-review updates verified; manual fields preserved`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.closeConnection());
