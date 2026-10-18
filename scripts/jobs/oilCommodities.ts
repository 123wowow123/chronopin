#!/usr/bin/env tsx
import '../env';
import { parseArgs } from 'node:util';
import { syncMonthlyOilCommodities, fetchBrentAndWtiCommodityMarkets } from '../../src/server/jobs/commodityOil';

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(`Usage: npx tsx scripts/jobs/oilCommodities.ts [--apply]

Scrapes prediction markets (Kalshi, Polymarket) for Brent and WTI crude oil
monthly commodity prices, creates predicted pins, threads them, and updates
realized pins with reasoning of final value and why prediction was missed or on point.

Options:
  --apply   Apply creations, threading and realization updates to the database
  --help    Show this help message
`);
  process.exit(0);
}

async function main() {
  console.log(`Starting monthly Brent and WTI commodity prediction market sync (apply=${values.apply})...`);
  const markets = await fetchBrentAndWtiCommodityMarkets();
  console.log(`Discovered ${markets.length} monthly commodity contracts:`);
  for (const m of markets) {
    console.log(
      `  - ${m.commodity} ${m.monthKey} (${m.status}): ${m.title} [Vol: $${m.marketVolume.toLocaleString()}]`,
    );
  }

  const result = await syncMonthlyOilCommodities({ apply: values.apply });
  console.log('\nSync summary:');
  console.log(`  Scanned:  ${result.scanned}`);
  console.log(`  Created:  ${result.created}`);
  console.log(`  Updated:  ${result.updated}`);
  console.log(`  Threaded: ${result.threaded}`);
  console.log('\nPins:');
  for (const p of result.pins) {
    console.log(
      `  [#${p.id}] ${p.commodity} ${p.monthKey}: ${p.title} (status: ${p.status}, parentId: ${p.parentId ?? 'none'})`,
    );
  }

  if (!values.apply) {
    console.log('\n[DRY RUN] Run with --apply to commit pin creations, threads and realization updates.');
  } else {
    console.log('\n[APPLIED] Successfully synchronized monthly commodity prediction pins.');
  }
}

main().catch((err) => {
  console.error('Oil commodities sync failed:', err);
  process.exit(1);
});
