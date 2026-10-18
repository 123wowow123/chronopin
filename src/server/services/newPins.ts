import Pins from '../model/pins';
import PinView from '../model/pinView';
import { cityOf } from '@/lib/city';
import { pinMarketRefs } from '@/lib/predictionMarkets';
import type { NewPin } from '@/lib/types';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';

// The pins added most recently, straight from the database. The home page
// reads it through newPins() in pages.ts, cached under the timeline tag; a
// page catching up on what its live stream missed (GET /api/pins/highlights)
// reads it here, since that tag is expired stale-while-revalidate and the
// cached list can still be a save behind - missing the very pin the page went
// looking for. Twelve rows, NEW_PINS_LIMIT in NewPins.tsx.
export async function loadNewPins(locale: Locale = DEFAULT_LOCALE): Promise<NewPin[]> {
  // A copy: the list is shared with whoever asked while it was being read,
  // and localizePins writes the translations into the pins it is given.
  return localizePins(structuredClone(await newestPins()), locale);
}

// The English list, one read at a time: a reconnecting page fetches it fresh
// (no cache, so it cannot miss a save), and a dropped stream drops every open
// page's at once. Callers that arrive while a read is under way share it
// rather than each run the query; the next caller after it finishes reads
// again, so nothing is ever older than the read it joined.
let reading: Promise<NewPin[]> | null = null;

function newestPins(): Promise<NewPin[]> {
  reading ??= readNewestPins().finally(() => {
    reading = null;
  });
  return reading;
}

async function readNewestPins(): Promise<NewPin[]> {
  const pins = await Pins.newest(12, await timelineMinConfidence());
  const pictures = await PinView.pictures(pins.map((p) => p.id));
  return pins.map(({ sourceUrl, referenceUrls, address, ...p }) => ({
    ...p,
    city: cityOf(address),
    utcStartDateTime: p.utcStartDateTime.toISOString(),
    utcCreatedDateTime: p.utcCreatedDateTime.toISOString(),
    hasMarket: pinMarketRefs({ sourceUrl, references: referenceUrls.map((url) => ({ url })) }).length > 0,
    ...pictures.get(p.id),
  }));
}
