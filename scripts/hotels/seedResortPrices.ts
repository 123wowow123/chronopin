import * as db from '../../src/server/db';
import { RESORT_PRICE_RANGES } from '../../src/lib/travel';

// Pins whose Pin.price records overall project construction/expansion budgets ($385M, $1.3B).
// Nightly stay rates for these properties are served via RESORT_PRICE_RANGES in src/lib/travel.ts.
const PROJECT_BUDGET_PIN_IDS = new Set([3404, 3234]);

async function main() {
  for (const [idStr, r] of Object.entries(RESORT_PRICE_RANGES)) {
    const id = Number(idStr);
    if (PROJECT_BUDGET_PIN_IDS.has(id)) {
      console.log(
        `Skipping pin ${id} DB price update (preserves project construction cost in Pin.price; nightly rate served via RESORT_PRICE_RANGES)`,
      );
      continue;
    }
    await db.query(
      `UPDATE "Pin" SET price = $1, "priceLowerBound" = $1, "priceUpperBound" = $2, "priceCurrency" = $3 WHERE id = $4`,
      [r.min, r.max, r.currency, id],
    );
    console.log(`Updated pin ${id} with price range $${r.min} - $${r.max} ${r.currency}`);
  }
  console.log('Finished updating resort price ranges in database.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
