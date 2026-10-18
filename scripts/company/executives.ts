// Finds each listed company's C-suite and their pay for the company panel
// (0125; src/server/executives.ts reads the Summary Compensation Table of its
// latest proxy statement on SEC EDGAR). Every lookup runs here, on the dev
// machine.
//
//   npm run companies:executives                       local DB: listed companies with none yet
//   npm run companies:executives -- --all              and refresh the ones that have some
//   npm run companies:executives -- --company Apple    one company (name or id)
//   npm run companies:executives -- --dry-run          print what it would store
//   npm run companies:executives -- --prod --token-file <admin token file>
//       the same lookups, stored on www.chronopin.com (admin token) instead
//
// The session is the fallback (a company with no filing - private, foreign,
// a subsidiary - or a table the reader cannot parse): `--apply file.json`
// stores what the session found by hand,
//   [{ "company": "Rockstar Games", "executives": [{ name, title, salary,
//      totalCompensation, currency, fiscalYear, sourceUrl }] }]
// pay left out is shown as "not disclosed". Add `--prod --token-file ...` to
// send it to prod. Local runs: then `npm run backup:data`.

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import CompanyExecutive, { type CompanyExecutiveInput } from '@/server/model/companyExecutive';
import { registrantName, sameCompany, secExecutives } from '@/server/executives';

const { values: flags } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    company: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    apply: { type: 'string' },
    prod: { type: 'boolean', default: false },
    base: { type: 'string', default: 'https://www.chronopin.com' },
    'token-file': { type: 'string' },
    delay: { type: 'string', default: '1' },
  },
});
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Companies whose own name is not the registrant's but that are the registrant.
const BRANDS_OF_REGISTRANT = new Set(['SpaceX', 'Google']);

type Target = { id: number; name: string; tickerSymbol: string | null; known: number };

async function localTargets(): Promise<Target[]> {
  const byIdOrName = flags.company;
  const rows = await db.query<Target>(
    `SELECT c."id", c."name", c."tickerSymbol", (SELECT count(*)::int FROM "CompanyExecutive" e WHERE e."companyId" = c."id") AS "known"
     FROM "Company" c
     WHERE c."tickerSymbol" IS NOT NULL
       AND ($1::text IS NULL OR c."id"::text = $1 OR c."name" = $1)
     ORDER BY c."name"`,
    [byIdOrName ?? null],
  );
  return flags.all || byIdOrName ? rows : rows.filter((r) => !r.known);
}

type Result = { company: string; executives: CompanyExecutiveInput[] };

async function lookUp(targets: Target[]): Promise<Result[]> {
  const results: Result[] = [];
  for (const [i, c] of targets.entries()) {
    try {
      // A division or label that shares its parent's ticker (Boeing Commercial
      // Airplanes, Columbia Records) is not the parent: its C-suite is not
      // the parent's. Brands that are the parent (Google) go in by hand.
      const registrant = await registrantName(c.tickerSymbol!);
      if (registrant && !BRANDS_OF_REGISTRANT.has(c.name) && !sameCompany(c.name, registrant)) {
        console.log(`${i + 1}/${targets.length} ${c.name} (${c.tickerSymbol}): skipped, ${registrant} files for it`);
        continue;
      }
      const found = await secExecutives(c.tickerSymbol!);
      console.log(`${i + 1}/${targets.length} ${c.name} (${c.tickerSymbol}): ${found ? `${found.executives.length} executives, proxy filed ${found.filed}` : 'no proxy statement'}`);
      if (found?.executives.length) results.push({ company: c.name, executives: found.executives });
    } catch (err) {
      console.log(`${i + 1}/${targets.length} ${c.name} (${c.tickerSymbol}): ${(err as Error).message}`);
    }
    await sleep(Number(flags.delay) * 1000);
  }
  return results;
}

const show = (r: Result) =>
  r.executives.forEach((e) => console.log(`  ${r.company}: ${e.name}, ${e.title}: salary ${e.salary ?? '-'}, total ${e.totalCompensation ?? '-'} (${e.fiscalYear ?? '?'})`));

async function storeLocal(results: Result[]) {
  for (const r of results) {
    const [company] = await db.query<{ id: number }>(`SELECT "id" FROM "Company" WHERE "name" = $1`, [r.company]);
    if (!company) {
      console.log(`No company named ${r.company} here`);
      continue;
    }
    await CompanyExecutive.replace(company.id, r.executives);
  }
  console.log(`Stored ${results.length} companies`);
}

// Prod's ids are its own: companies are matched by name from its list.
async function storeProd(results: Result[]) {
  if (!flags['token-file']) throw new Error('--prod needs --token-file');
  const headers = { Authorization: `Bearer ${readFileSync(flags['token-file'], 'utf8').trim()}`, 'Content-Type': 'application/json' };
  const list = (await (await fetch(`${flags.base}/api/companies`, { headers })).json()) as { id: number; name: string }[];
  const idOf = new Map(list.map((c) => [c.name.toLowerCase(), c.id]));
  for (const r of results) {
    const id = idOf.get(r.company.toLowerCase());
    if (!id) {
      console.log(`${r.company}: not on ${flags.base}`);
      continue;
    }
    const res = await fetch(`${flags.base}/api/companies/${id}/executives`, { method: 'PUT', headers, body: JSON.stringify(r.executives) });
    console.log(`${r.company}: ${res.ok ? `stored ${r.executives.length}` : `${res.status} ${await res.text()}`}`);
  }
}

async function run() {
  const results: Result[] = flags.apply ? JSON.parse(readFileSync(flags.apply, 'utf8')) : await lookUp(await localTargets());
  results.forEach(show);
  if (flags['dry-run'] || !results.length) return;
  await (flags.prod ? storeProd(results) : storeLocal(results));
}

run()
  .catch((err) => {
    console.log('Company executives err:', err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
