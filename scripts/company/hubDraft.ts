// Drafts a company hub product tree from its dated pins, so a session reviews it instead of writing it.
//
//   npx tsx scripts/company/hubDraft.ts "Apple" [rules.json]
//
// Prints { company, products:[{name, pinIds, unassigned?}] } and a coverage line. It never writes to the DB;
// PUT the reviewed JSON to /api/admin/company-hub (docs/okf/api/company-hub.md). rules.json is
// { "Product": ["keyword", ...] } (case-insensitive, matched on title + productName, first match wins).
// Pins that match nothing go to "Other" for the reviewer to place or drop. Overviews, facts and milestones
// are not drafted: write them from the pins' own sources with [pin:ID] citations.

import '../env';
import { readFileSync } from 'node:fs';
import * as db from '@/server/db';

const [company, rulesPath] = process.argv.slice(2);
if (!company) throw new Error('usage: hubDraft.ts <company name> [rules.json]');
const rules: Record<string, string[]> = rulesPath ? JSON.parse(readFileSync(rulesPath, 'utf8')) : {};

async function run() {
  const pins = await db.query<{ id: number; title: string; productName: string | null; d: string }>(
    `SELECT p."id", p."title", p."productName", to_char(p."utcStartDateTime",'YYYY-MM-DD') AS d
       FROM "Pin" p JOIN "Company" c ON c."id" = p."companyId"
      WHERE c."name" = $1 AND p."utcDeletedDateTime" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "CompanyHub" h WHERE h."pinId" = p."id")
      ORDER BY p."utcStartDateTime"`,
    [company],
  );
  const groups = new Map<string, number[]>();
  for (const p of pins) {
    const hay = `${p.title} ${p.productName ?? ''}`.toLowerCase();
    const hit = Object.entries(rules).find(([, kws]) => kws.some((k) => hay.includes(k.toLowerCase())));
    const name = hit ? hit[0] : 'Other';
    groups.set(name, [...(groups.get(name) ?? []), p.id]);
  }
  const products = [...groups].map(([name, pinIds]) => ({ name, pinIds }));
  const placed = products.filter((p) => p.name !== 'Other').reduce((n, p) => n + p.pinIds.length, 0);
  console.log(JSON.stringify({ company, products }, null, 1));
  console.error(`${pins.length} dated pins, ${placed} placed in ${products.filter((p) => p.name !== 'Other').length} products, ${pins.length - placed} in Other`);
  const ok = pins.length >= 10 && products.filter((p) => p.name !== 'Other' && p.pinIds.length >= 2).length >= 3;
  console.error(ok ? 'Meets the hub bar (10+ pins, 3+ products).' : 'Below the hub bar.');
}
run().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.closeConnection());
