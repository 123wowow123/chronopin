// Stock tickers for pins (src/server/services/pinStocks.ts): looks up each
// pin's company's US ticker (once per company), adds it to the company's pins,
// and prices the snapshots that are due. Pins sync on every save too, so this
// is the backfill and the catch-up for start dates that have since closed.
//
//   npm run stocks:sync                  every live pin with a company or a ticker
//   npm run stocks:sync -- --pin 930     just that pin (repeatable)
//   npm run stocks:sync -- --dry-run     only list the companies it would look up
//
// A company's related and supplier tickers come from Claude the first time
// one of its pins syncs. By hand instead (no credit, or a correction), which
// Claude never overwrites, then syncs the company's pins:
//
//   npm run stocks:sync -- --company OpenAI --relate "MSFT:related:Largest investor and cloud partner" --relate "NVDA:supplier:Training GPUs"

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { normalizeSymbol } from '@/lib/stocks';
import CompanyRelation from '@/server/model/companyRelation';
import { syncPinStocks } from '@/server/services/pinStocks';
import { identify } from '@/server/stocks';

const { values: flags } = parseArgs({
  options: {
    pin: { type: 'string', multiple: true },
    'dry-run': { type: 'boolean', default: false },
    company: { type: 'string' },
    relate: { type: 'string', multiple: true },
  },
});

// Nasdaq is the website's own backend: go gently.
const PAUSE_MS = 400;

// Sets a company's relations by hand; answers the pins to sync.
async function relate(company: string, entries: string[]): Promise<number[]> {
  const [row] = await db.query<{ id: number; name: string }>(`SELECT "id", "name"::text AS "name" FROM "Company" WHERE "name" = $1`, [company]);
  if (!row) throw new Error(`no company named ${company}`);
  for (const entry of entries) {
    const [raw, relation, ...note] = entry.split(':');
    const symbol = normalizeSymbol(raw);
    if (!symbol || (relation !== 'related' && relation !== 'supplier')) throw new Error(`--relate "${entry}" is not SYMBOL:related|supplier:note`);
    const listing = await identify(symbol);
    if (!listing) throw new Error(`Nasdaq has no US stock or ETF ${symbol}`);
    await CompanyRelation.set(row.id, { symbol, name: listing.quote.name, assetClass: listing.assetClass, relation, note: note.join(':').trim() || null, origin: 'manual' });
    console.log(`${row.name}: ${symbol} (${listing.quote.name}) ${relation}`);
  }
  // Set by hand, so not asked of Claude as well.
  await CompanyRelation.markChecked(row.id);
  const pins = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "companyId" = $1 AND "utcDeletedDateTime" IS NULL ORDER BY "id"`, [row.id]);
  return pins.map((p) => p.id);
}

async function run() {
  if (flags.relate?.length || flags.company) {
    if (!flags.company || !flags.relate?.length) throw new Error('--company and --relate go together');
    flags.pin = (await relate(flags.company, flags.relate)).map(String);
    if (!flags.pin.length) return;
  }
  if (flags['dry-run']) {
    const rows = await db.query<{ name: string; pins: number }>(
      `SELECT "c"."name"::text AS "name", COUNT("p"."id")::integer AS "pins" FROM "Company" AS "c"
         JOIN "Pin" AS "p" ON "p"."companyId" = "c"."id" AND "p"."utcDeletedDateTime" IS NULL
       WHERE "c"."utcTickerCheckedDateTime" IS NULL GROUP BY "c"."name" ORDER BY "c"."name"`,
    );
    rows.forEach((r) => console.log(`${r.name} (${r.pins} pin(s))`));
    console.log(`${rows.length} company(ies) to look up`);
    return;
  }
  const pinIds = flags.pin?.map(Number) ??
    (
      await db.query<{ id: number }>(
        `SELECT "id" FROM "Pin" AS "p" WHERE "utcDeletedDateTime" IS NULL
           AND ("companyId" IS NOT NULL OR EXISTS (SELECT 1 FROM "PinTicker" WHERE "pinId" = "p"."id" AND "utcRemovedDateTime" IS NULL))
         ORDER BY "id"`,
      )
    ).map((r) => r.id);
  let withStocks = 0;
  for (const pinId of pinIds) {
    const stocks = await syncPinStocks(pinId);
    if (stocks.length) {
      withStocks++;
      console.log(
        `pin ${pinId}: ${stocks
          .map((s) => `${s.symbol} posted ${s.posted?.price ?? '-'}, start ${s.starts.find((x) => x.current)?.price?.price ?? 'pending'}`)
          .join('; ')}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }
  console.log(`${pinIds.length} pin(s) synced, ${withStocks} with stock tickers`);
}

run()
  .catch((err) => {
    console.log('stocks:sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
