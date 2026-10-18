// Finds each company's parent (Company.parentCompanyId, 0126) for the company
// panel's parent tile: Wikidata's "parent organization" (P749), from the company's Wikipedia article (src/server/companyParent.ts).
// Every lookup runs here, on the dev machine.
//
//   npm run companies:parents                        local DB: companies never looked up
//   npm run companies:parents -- --all               every company again
//   npm run companies:parents -- --dry-run           print what it would set
//   npm run companies:parents -- --set "Rockstar North=Rockstar Games"
//       by hand (a company Wikidata knows no parent for); "Child=" clears one
//   npm run companies:parents -- --prod --token-file <admin token file>
//       send the local parents to www.chronopin.com (matched by company name)
//
// Local runs: then `npm run backup:data`.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Company from '@/server/model/company';
import { findParents } from '@/server/companyParent';

const { values: flags } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    set: { type: 'string', multiple: true },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string' },
  },
});

type Row = { id: number; name: string; wikiUrl: string | null };

async function byName(name: string): Promise<Row> {
  const [row] = await db.query<Row>(`SELECT "id", "name", "wikiUrl" FROM "Company" WHERE "name" = $1`, [name]);
  if (!row) throw new Error(`No company named ${name}`);
  return row;
}

async function setByHand() {
  for (const pair of flags.set ?? []) {
    const [child, parent] = pair.split('=').map((s) => s.trim());
    const company = await byName(child);
    if (flags['dry-run']) console.log(`${child} -> ${parent || '(none)'}`);
    else console.log(`${child} -> ${(await Company.setParent(company.id, parent || null))?.name ?? '(none)'}`);
  }
}

async function lookUp() {
  const companies = await db.query<Row>(
    `SELECT "id", "name", "wikiUrl" FROM "Company" WHERE ($1 OR "utcParentCheckedDateTime" IS NULL) ORDER BY "id"`,
    [flags.all],
  );
  console.log(`Looking up parents for ${companies.length} companies`);
  const found = await findParents(companies);
  let set = 0;
  for (const c of companies) {
    if (!found.has(c.id)) continue;
    const parent = found.get(c.id) ?? null;
    if (parent && parent.name.toLowerCase() === c.name.toLowerCase()) continue;
    if (parent) console.log(`${c.name} -> ${parent.name}`);
    if (flags['dry-run']) continue;
    if ((await Company.setParent(c.id, parent?.name ?? null, parent?.wikiUrl)) || !parent) set += parent ? 1 : 0;
  }
  console.log(`${set} parents set`);
}

async function sendToProd() {
  if (!flags['token-file']) throw new Error('--prod needs --token-file');
  const headers = { Authorization: `Bearer ${readFileSync(flags['token-file'], 'utf8').trim()}`, 'Content-Type': 'application/json' };
  const list = (await (await fetch(`${flags.base}/api/companies`, { headers })).json()) as { id: number; name: string }[];
  const idOf = new Map(list.map((c) => [c.name.toLowerCase(), c.id]));
  const rows = await db.query<{ name: string; parent: string; wikiUrl: string | null }>(
    `SELECT c."name", p."name" AS "parent", p."wikiUrl" FROM "Company" c JOIN "Company" p ON p."id" = c."parentCompanyId" ORDER BY c."id"`,
  );
  for (const r of rows) {
    const id = idOf.get(r.name.toLowerCase());
    if (!id) continue;
    if (flags['dry-run']) {
      console.log(`${r.name} -> ${r.parent}`);
      continue;
    }
    const res = await fetch(`${flags.base}/api/companies/${id}/parent`, { method: 'PUT', headers, body: JSON.stringify({ parent: r.parent, wikiUrl: r.wikiUrl }) });
    if (!res.ok) console.log(`${r.name}: ${res.status} ${await res.text()}`);
  }
  console.log(`Sent ${rows.length} parents to ${flags.base}`);
}

(flags.prod ? sendToProd() : flags.set?.length ? setByHand() : lookUp())
  .catch((err) => {
    console.log('Company parents err:', err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
