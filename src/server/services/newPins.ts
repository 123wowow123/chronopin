import Pins from '../model/pins';
import PinView from '../model/pinView';
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
// looking for. Five rows.
export async function loadNewPins(locale: Locale = DEFAULT_LOCALE): Promise<NewPin[]> {
  const pins = await Pins.newest(5, await timelineMinConfidence());
  const pictures = await PinView.pictures(pins.map((p) => p.id));
  return localizePins(pins.map(({ sourceUrl, referenceUrls, ...p }) => ({
    ...p,
    utcCreatedDateTime: p.utcCreatedDateTime.toISOString(),
    hasMarket: pinMarketRefs({ sourceUrl, references: referenceUrls.map((url) => ({ url })) }).length > 0,
    ...pictures.get(p.id),
  })), locale);
}
