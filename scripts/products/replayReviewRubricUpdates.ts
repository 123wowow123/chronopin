// Replay specifically researched handling/basis corrections, preserving all
// other rubric fields. Match each environment by the pin's stable source URL.
import '../env';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import * as db from '@/server/db';
import { adminDbRequest, prodBase, reviewResearchRequest } from '@/server/jobs/pinApi';
import { REVIEW_ENDPOINTS } from '@/server/jobs/reviewResearch';
import { findReviewCatalogEntry } from './reviewCatalog';

type Entry = { table: 'PinCarPerf' | 'PinGasCarPerf'; pinSourceUrl: string; expectedBasis: string; expectedHandling?: null; changes: { basis: string; handling?: number } };
const { values } = parseArgs({ options: { file: { type: 'string' }, output: { type: 'string' } } });
async function run() {
  if (!values.file) throw new Error('--file required');
  const { entries } = JSON.parse(readFileSync(values.file, 'utf8')) as { entries: Entry[] };
  const prepared = [];
  for (const entry of entries) {
    if (!['PinCarPerf', 'PinGasCarPerf'].includes(entry.table) || !entry.pinSourceUrl.startsWith('https://') || !entry.changes.basis?.trim() || entry.changes.basis.length > 1000
      || Object.keys(entry.changes).some((key) => !['basis', 'handling'].includes(key))) throw new Error('Invalid researched correction');
    if (entry.changes.handling !== undefined && (entry.table !== 'PinGasCarPerf' || entry.expectedHandling !== null || !Number.isFinite(entry.changes.handling)
      || entry.changes.handling < 0 || entry.changes.handling > 5 || entry.changes.handling * 2 % 1)) throw new Error('Invalid handling correction');
    const pins = await db.query<{ id: number }>('SELECT id FROM "Pin" WHERE "sourceUrl"=$1 AND "utcDeletedDateTime" IS NULL', [entry.pinSourceUrl]);
    if (pins.length !== 1) throw new Error('Local pin identity missing or ambiguous');
    const targets = [{ pinId: pins[0].id, production: false }];
    if (prodBase()) {
      const found = await adminDbRequest<{ rows: { id: number }[] }>('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(entry.pinSourceUrl)}&utcDeletedDateTime.null=true&limit=2`);
      if (found.rows.length !== 1) throw new Error('Production pin identity missing or ambiguous');
      targets.push({ pinId: found.rows[0].id, production: true });
    }
    for (const target of targets) {
      const path = `/api/pins/${target.pinId}/${REVIEW_ENDPOINTS[entry.table]}`;
      const row = await reviewResearchRequest<Record<string, any>>('GET', path, undefined, target.production);
      if (!row || row.source === 'hand' || ![entry.expectedBasis, entry.changes.basis].includes(row.basis)
        || (entry.changes.handling !== undefined && ![null, entry.changes.handling].includes(row.handling))) throw new Error('Rubric changed since research');
      prepared.push({ entry, ...target, path, row });
    }
  }
  const results = [];
  for (const target of prepared) {
    const current = await reviewResearchRequest('GET', target.path, undefined, target.production);
    if (!isDeepStrictEqual(current, target.row)) throw new Error('Concurrent rubric change; stopped');
    if (Object.entries(target.entry.changes).some(([key, value]) => target.row[key] !== value)) {
      await reviewResearchRequest('PUT', target.path, { ...target.row, ...target.entry.changes }, target.production);
    }
    const saved = await reviewResearchRequest<Record<string, any>>('GET', target.path, undefined, target.production);
    for (const [key, value] of Object.entries({ ...target.row, ...target.entry.changes })) {
      if (key !== 'checkedAt' && !isDeepStrictEqual(saved[key], value)) throw new Error(`Correction readback failed: ${key}`);
    }
    results.push({ pinId: target.pinId, production: target.production, table: target.entry.table, changes: target.entry.changes, otherFieldsPreserved: true });
  }
  const file = 'scripts/products/carPerf.json';
  const catalog = JSON.parse(readFileSync(file, 'utf8')) as any[];
  for (const target of prepared.filter((t) => !t.production && t.entry.table === 'PinCarPerf')) {
    const item = findReviewCatalogEntry(catalog, target.entry.pinSourceUrl, target.row.sourceUrl);
    if (!item) throw new Error('Missing synchronized car catalog entry');
    item.basis = target.entry.changes.basis;
  }
  writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
  if (values.output) writeFileSync(values.output, JSON.stringify(results, null, 2) + '\n');
  console.log(`${results.length} rubric corrections saved and read back; other fields preserved`);
}
run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.closeConnection());
