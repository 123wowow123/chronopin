// Reads a game pin's maturity rating, platforms and aggregated ratings and
// stores them (PinGameInfo, 0124; PinRating). Run on save for Gaming pins and
// by `npm run games:info` for existing ones.
//
// Steam's page gives the PC game's Metacritic and user-review scores; a game
// Steam does not sell (a console exclusive, one not yet listed) is scored from
// Wikidata and OpenCritic by its title instead (scrape/screen.ts findGameScores).

import { hasCategory } from '@/lib/categories';
import { findGameFacts, type GameFacts, type GameRating } from '../gameFacts';
import { saveGameInfo } from '../model/pinGameInfo';
import { PIN_CATEGORIES } from '../model/pinTag';
import Pin from '../model/pin';
import * as db from '../db';
import { GAME_CATEGORIES } from '../scrape/scoreMarkets';
import { findGameScores } from '../scrape/screen';
import { steamAppId } from '../steamListing';
import { expirePinPage } from './cache';
import { hasGameInfo } from '@/lib/gameInfo';

// The Steam app a pin links: its Buy button, else its source or a reference.
export async function steamAppOfPin(pinId: number): Promise<number | undefined> {
  const rows = await db.query<{ url: string }>(
    `SELECT "url" FROM "Merchant" WHERE "pinId" = $1 AND "url" ILIKE '%steampowered.com/app/%'
     UNION ALL SELECT "sourceUrl" FROM "Pin" WHERE "id" = $1
     UNION ALL SELECT "url" FROM "PinReference" WHERE "pinId" = $1`,
    [pinId],
  );
  for (const { url } of rows) {
    const id = steamAppId(url);
    if (id) return id;
  }
  return undefined;
}

// Every score a game pin can have, each source once: Steam's reading first,
// then what a title search finds for the sources it did not give.
export async function gameScoresOfPin(pinId: number, facts?: GameFacts): Promise<GameRating[]> {
  const rows = await db.query<{ title: string; start: Date; categories: string[] }>(
    `SELECT "title", "utcStartDateTime" AS "start",
            ${PIN_CATEGORIES} AS "categories"
     FROM "Pin" WHERE "id" = $1`,
    [pinId],
  );
  const pin = rows[0];
  const ratings = [...(facts?.ratings ?? [])];
  if (!pin || !hasCategory(pin.categories, GAME_CATEGORIES)) return ratings;
  const found = await findGameScores({
    pinTitle: pin.title,
    year: new Date(pin.start).getUTCFullYear(),
    // The store's own name for the game is the exact title a match needs.
    extraTitles: facts?.name ? [facts.name] : [],
  });
  for (const rating of found) {
    if (!ratings.some((r) => r.source === rating.source)) ratings.push(rating);
  }
  return ratings;
}

// Whether anything was stored. A pin with no Steam page still gets scores.
export async function refreshGameInfo(pinId: number): Promise<boolean> {
  const appId = await steamAppOfPin(pinId);
  const facts = appId ? await findGameFacts(appId) : undefined;
  const ratings = await gameScoresOfPin(pinId, facts);
  let stored = false;
  if (facts && hasGameInfo(facts.info)) stored = await saveGameInfo(pinId, facts.info, { source: facts.source, sourceUrl: facts.sourceUrl });
  if (ratings.length) {
    await Pin.setRatings(pinId, ratings);
    stored = true;
  }
  if (stored) expirePinPage(pinId);
  return stored;
}
