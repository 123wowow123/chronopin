// A pin's review score from Kalshi (scrape/scoreMarkets.ts), kept in step
// with the market: run after every save and edit, so a pin posted by API
// without a scrape gets it too, and by `npm run media:score-markets`.

import { firstCategoryOf } from '@/lib/categories';
import * as db from '../db';
import Pin from '../model/pin';
import { PIN_CATEGORIES } from '../model/pinTag';
import { findScoreMarket, GAME_CATEGORIES, scoreRating, scoreSiteFor, type ScoreMarket } from '../scrape/scoreMarkets';
import { SCREEN_CATEGORIES } from '../scrape/screen';

export type ScoreMarketSync = { market: ScoreMarket; kept: boolean; droppedForecast: boolean };

// What the pin's market would change, and with apply, changes it. The site's
// own score (Wikidata's, or an earlier settlement) is kept and makes a
// forecast moot; a settled market's score replaces its forecast.
export async function syncPinScoreMarket(pinId: number, { apply = true } = {}): Promise<ScoreMarketSync | undefined> {
  const [pin] = await db.query<{ title: string; categories: string[]; utcStartDateTime: Date }>(
    `SELECT "title", ${PIN_CATEGORIES} AS "categories", "utcStartDateTime" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin || !scoreSiteFor(pin.categories)) return undefined;
  const market = await findScoreMarket(
    { pinTitle: pin.title, category: firstCategoryOf(pin.categories, [...SCREEN_CATEGORIES, ...GAME_CATEGORIES]), year: new Date(pin.utcStartDateTime).getUTCFullYear() },
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
