// Scores the scraped reviews kept beside the rubrics (taste, car, gas car,
// aircraft, LLM, video, hotel, dining) that have no sentiment yet, for the
// sentiment graph on a pin (src/components/pin/PinReviewSentiment.tsx). Saving
// a rubric with reviews does not score them; this catches up, and a review
// without a quote is skipped (nothing to read).
//
//   npm run reviews:sentiment                 every unscored review
//   npm run reviews:sentiment -- --limit 50   at most 50 of them
//   npm run reviews:sentiment -- --dry-run    count them, call nothing
//
// Scores live in the rubric's reviews column (PinReview.sentiment), so
// `npm run backup:data` keeps them. Without an API key a session can score
// by hand and write the same field through the rubric's PUT endpoint.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { scoreReviewSentiment } from '@/server/extract/reviewSentiment';
import type { PinReview } from '@/lib/pinReviews';

const TABLES = ['PinTaste', 'PinCarPerf', 'PinGasCarPerf', 'PinAircraftPerf', 'PinLlmPerf', 'PinVideoPerf', 'PinHotel', 'PinDining', 'PinCriticReview'];

const { values: flags } = parseArgs({ options: { limit: { type: 'string' }, 'dry-run': { type: 'boolean' } } });

async function run() {
  let budget = flags.limit ? Number(flags.limit) : Infinity;
  let scored = 0;
  let pending = 0;
  for (const table of TABLES) {
    const rows = await db.query<{ pinId: number; title: string; reviews: PinReview[] }>(
      `SELECT t."pinId", p."title", t."reviews" FROM "${table}" t JOIN "Pin" p ON p."id" = t."pinId" WHERE jsonb_array_length(t."reviews") > 0`,
    );
    for (const row of rows) {
      let changed = false;
      for (const review of row.reviews) {
        if (review.sentiment != null || !review.quote) continue;
        pending++;
        if (flags['dry-run'] || budget <= 0) continue;
        const sentiment = await scoreReviewSentiment({ pinTitle: row.title, title: review.title, quote: review.quote });
        if (sentiment == null) {
          console.log(`${table} ${row.pinId}: ${review.url} not scored`);
          continue;
        }
        review.sentiment = sentiment;
        changed = true;
        scored++;
        budget--;
      }
      if (changed) await db.query(`UPDATE "${table}" SET "reviews" = $1::jsonb WHERE "pinId" = $2`, [JSON.stringify(row.reviews), row.pinId]);
    }
  }
  console.log(`${pending} unscored review(s)${flags['dry-run'] ? '' : `, scored ${scored}`}`);
}

run()
  .catch((err) => {
    console.log('reviews:sentiment failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
