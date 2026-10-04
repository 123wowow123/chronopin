// Reads a game pin's maturity rating, platforms and aggregated ratings from
// its Steam page and stores them (PinGameInfo, 0124; PinRating). Run on save
// for Gaming pins and by `npm run games:info` for existing ones.

import { findGameFacts } from '../gameFacts';
import { saveGameInfo } from '../model/pinGameInfo';
import Pin from '../model/pin';
import * as db from '../db';
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

// Whether anything was stored. A pin without a Steam page has nothing to read.
export async function refreshGameInfo(pinId: number): Promise<boolean> {
  const appId = await steamAppOfPin(pinId);
  if (!appId) return false;
  const facts = await findGameFacts(appId);
  if (!facts) return false;
  let stored = false;
  if (hasGameInfo(facts.info)) stored = await saveGameInfo(pinId, facts.info, { source: facts.source, sourceUrl: facts.sourceUrl });
  if (facts.ratings.length) {
    await Pin.setRatings(pinId, facts.ratings);
    stored = true;
  }
  if (stored) expirePinPage(pinId);
  return stored;
}
