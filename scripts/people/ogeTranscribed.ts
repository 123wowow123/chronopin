// Loads OGE 278-T reports that were transcribed by hand from scanned images -
// the reports the importer refuses because their embedded text is OCR noise
// (all of Donald Trump's). The data file holds every row as printed: description,
// type, date and OGE's amount range (a 278-T gives no ticker and no owner).
//
//   npm run people:oge-transcribed -- [--dry-run]
//       local DB (silent: no watcher is told, an already stored report is replaced by id)
//   npm run people:oge-transcribed -- --prod --token-file <admin token file>
//       POST to /api/admin/person-trades with replace:true (the person is found by name on prod)
//
// scripts/people/data/oge-278t-trump-transcribed.json: [{ filingId (the report's id in OGE's
// PAS index), sourceUrl, filedDate (the date in the file's name), rows: [{ n, desc, type, date, amount }] }]

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parseAmount, type ParsedTrade } from '@/lib/trades';
import * as db from '@/server/db';
import PersonTrade from '@/server/model/personTrade';

const { values: flags } = parseArgs({
  options: { 'dry-run': { type: 'boolean', default: false }, prod: { type: 'boolean', default: false }, base: { type: 'string', default: 'https://www.chronopin.com' }, 'token-file': { type: 'string' }, file: { type: 'string', default: 'scripts/people/data/oge-278t-trump-transcribed.json' }, person: { type: 'string', default: 'Donald J. Trump' } },
});

type Row = { n: number; desc: string; type: 'purchase' | 'sale' | 'exchange'; date: string; amount: string };
type Report = { filingId: string; sourceUrl: string; filedDate: string; rows: Row[] };

const trades = (rows: Row[]): ParsedTrade[] =>
  rows.map((r) => {
    const { low, high } = parseAmount(r.amount);
    return { owner: 'self', asset: r.desc.slice(0, 300), ticker: null, assetType: null, txType: r.type, txDate: r.date, notifiedDate: null, amountLow: low, amountHigh: high };
  });

async function main() {
  const reports = JSON.parse(readFileSync(flags.file!, 'utf8')) as Report[];
  const filings = reports.map((r) => ({ chamber: 'executive' as const, filingId: r.filingId, filedDate: r.filedDate, sourceUrl: r.sourceUrl, trades: trades(r.rows) }));
  console.log(`${filings.length} reports, ${filings.reduce((n, f) => n + f.trades.length, 0)} rows`);
  if (flags['dry-run']) return;
  if (flags.prod) {
    const headers = { Authorization: `Bearer ${readFileSync(flags['token-file']!, 'utf8').trim()}`, 'Content-Type': 'application/json' };
    const people = (await (await fetch(`${flags.base}/api/people`)).json()) as { id: number; name: string }[];
    const match = people.filter((p) => p.name === flags.person);
    if (match.length !== 1) throw new Error(`${flags.person}: ${match.length} people on prod`);
    for (const f of filings) {
      const res = await fetch(`${flags.base}/api/admin/person-trades`, { method: 'POST', headers, body: JSON.stringify({ filings: [{ ...f, personId: match[0].id, replace: true }] }) });
      if (!res.ok) throw new Error(`${f.filingId}: ${res.status} ${await res.text()}`);
      console.log(f.filingId, await res.text());
    }
    return;
  }
  const rows = await db.query<{ id: number }>(`SELECT "id" FROM "Person" WHERE "name" = $1`, [flags.person]);
  if (rows.length !== 1) throw new Error(`${flags.person}: ${rows.length} people`);
  for (const f of filings) console.log(f.filingId, await PersonTrade.replaceFiling(rows[0].id, f));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.closeConnection());
