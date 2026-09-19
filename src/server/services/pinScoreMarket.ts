// A pin's review score from Kalshi (scrape/scoreMarkets.ts), kept in step
// with the market: run after every save and edit, so a pin posted by API
// without a scrape gets it too, and by `npm run media:score-markets`.

import * as db from '../db';
import Pin from '../model/pin';
import { findScoreMarket, scoreRating, scoreSiteFor, type ScoreMarket } from '../scrape/scoreMarkets';

export type ScoreMarketSync = { market: ScoreMarket; kept: boolean; droppedForecast: boolean };

// What the pin's market would change, and with apply, changes it. The site's
// own score (Wikidata's, or an earlier settlement) is kept and makes a
// forecast moot; a settled market's score replaces its forecast.
export async function syncPinScoreMarket(pinId: number, { apply = true } = {}): Promise<ScoreMarketSync | undefined> {
  const [pin] = await db.query<{ title: string; category: string | null; utcStartDateTime: Date }>(
    `SELECT "title", "category", "utcStartDateTime" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin || !scoreSiteFor(pin.category)) return undefined;
  const market = await findScoreMarket(
    { pinTitle: pin.title, category: pin.category, year: new Date(pin.utcStartDateTime).getUTCFullYear() },
    60000,
  );
  if (!market) return undefined;

  const rating = scoreRating(market);
  const forecast = scoreRating({ ...market, settled: false }).source;
  const existing = await db.query<{ source: string; score: string }>(`SELECT "source", "score" FROM "PinRating" WHERE "pinId" = $1`, [pinId]);
  const kept = existing.some((r) => r.source === market.site);
  const droppedForecast = (market.settled || kept) && existing.some((r) => r.source === forecast);
  if (apply) {
    if (!kept) await Pin.setRatings(pinId, [rating]);
    if (droppedForecast) await db.query(`DELETE FROM "PinRating" WHERE "pinId" = $1 AND "source" = $2`, [pinId, forecast]);
  }
  return { market, kept, droppedForecast };
}
