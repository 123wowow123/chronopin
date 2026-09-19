// Gives existing film, TV, anime and game pins the review score Kalshi bets
// on (src/server/scrape/scoreMarkets.ts), and keeps it current: an open
// market's forecast is refreshed, and once the market settles the forecast
// is replaced by the site's actual score. New and edited pins get this on
// save (services/pinScoreMarket.ts); this is for the rest, and to refresh.
//
//   npm run media:score-markets                  list what would change
//   npm run media:score-markets -- --apply       change it
//   npm run media:score-markets -- --ids 769,389 --apply
//
// Matching is by exact title and year, like media:screen, so read the dry run.
// Then `npm run backup:data` to keep it in the seed data.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { GAME_CATEGORIES, scoreRating } from '@/server/scrape/scoreMarkets';
import { SCREEN_CATEGORIES } from '@/server/scrape/screen';
import { syncPinScoreMarket } from '@/server/services/pinScoreMarket';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    // Between pins that matched, to go easy on Kalshi's keyless rate limit.
    pause: { type: 'string', default: '500' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const categories = [...SCREEN_CATEGORIES, ...GAME_CATEGORIES];
  const rows = await db.query<{ id: number; title: string }>(
    `SELECT "id", "title" FROM "Pin"
     WHERE "category" = ANY($1::citext[]) AND "utcDeletedDateTime" IS NULL ${ids?.length ? 'AND "id" = ANY($2::int[])' : ''}
     ORDER BY "id"`,
    ids?.length ? [categories, ids] : [categories],
  );
  console.log(`${flags.apply ? 'Updating' : 'Dry run over'} ${rows.length} pins`);
  const totals = { forecasts: 0, settled: 0, kept: 0 };

  for (const row of rows) {
    // Only the (cached) event list is read for a pin that matches nothing.
    let sync;
    try {
      sync = await syncPinScoreMarket(row.id, { apply: flags.apply });
    } catch (err) {
      console.log(`${row.id} ${row.title}\n    failed: ${(err as Error).message}`);
      continue;
    }
    if (!sync) continue;
    const { market, kept, droppedForecast } = sync;
    const rating = scoreRating(market);
    console.log(
      `${row.id} ${row.title}\n    Kalshi "${market.title}" ${market.eventTicker}: ${rating.source} ${rating.score}` +
        (kept ? ' (has its own, kept)' : '') +
        (droppedForecast ? `; drops the forecast` : ''),
    );
    if (kept) totals.kept++;
    else if (market.settled) totals.settled++;
    else totals.forecasts++;
    await sleep(Number(flags.pause));
  }
  console.log(
    `${flags.apply ? 'Saved' : 'Would save'} ${totals.forecasts} forecasts and ${totals.settled} settled scores; ${totals.kept} pins kept their own score`,
  );
}

run()
  .catch((err) => {
    console.log('Score markets err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
