// Data for the /travel landing page: the best resorts and retreats ranked on
// Chronopin's published hotel rubric (PinHotel, schema 0174), paired with
// destination climate and "best time to go" seasonal intelligence.

import { cacheLife, cacheTag } from 'next/cache';
import * as db from '../db';
import Pins, { pinConfidenceOf } from '../model/pins';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { type PinHotelJson } from '@/lib/pinHotel';
import {
  getBestTimeToGo,
  getResortPricePerNight,
  getResortTopActivities,
  type TravelResortPin,
  type TravelShelf,
} from '@/lib/travel';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';

function acclaimLabel(acclaim: number | null): string | undefined {
  if (acclaim == null) return undefined;
  if (acclaim >= 5) return 'Three MICHELIN Keys · Extraordinary Stay';
  if (acclaim >= 4) return 'Two MICHELIN Keys · Exceptional Stay';
  if (acclaim >= 3) return 'One MICHELIN Key · Forbes Acclaimed';
  if (acclaim >= 2) return 'Four Diamond · Critic Acclaimed';
  if (acclaim >= 1) return 'MICHELIN Guide Selection';
  return undefined;
}

function computeRubricScore(hotel: PinHotelJson): number {
  const axes = [hotel.rooms, hotel.service, hotel.location, hotel.cleanliness, hotel.value].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  if (!axes.length) return 4.0;
  const guestAvg = axes.reduce((a, b) => a + b, 0) / axes.length;
  // If property has critic acclaim, blend slightly with guest satisfaction
  if (hotel.acclaim && hotel.acclaim > 0) {
    const blended = guestAvg * 0.8 + hotel.acclaim * 0.2;
    return Math.round(blended * 10) / 10;
  }
  return Math.round(guestAvg * 10) / 10;
}

// Curation sets for each shelf
const SHELF_DEFINITIONS = [
  {
    id: 'top-resorts',
    name: 'Top Sanctuaries',
    label: 'Top-Ranked Sanctuaries',
    tagline: 'The world’s highest-scoring properties on guest satisfaction and critic acclaim.',
    pinIds: [15302, 15274, 15290, 15292, 15303, 4058, 15283, 15284, 15288, 15289, 4129, 15278],
  },
  {
    id: 'coastal-escapes',
    name: 'Island & Coastal',
    label: 'Island & Coastal Escapes',
    tagline: 'Sun-soaked beachfront havens, private island villas, and coastal retreats timed to calm waters and dry seasons.',
    pinIds: [15289, 15295, 15275, 15293, 4129, 15278, 15279, 15280],
  },
  {
    id: 'cultural-sanctuaries',
    name: 'Historic & Cultural',
    label: 'Historic & Cultural Sanctuaries',
    tagline: 'Storied palaces, heritage conversions, and urban retreats immersed in world history and art.',
    pinIds: [15294, 15302, 15282, 15285, 15288, 15276, 15292, 15290, 15286, 15291, 15281, 15277],
  },
  {
    id: 'wonder-retreats',
    name: 'Alpine & Wonder',
    label: 'Alpine & Wonder Escapes',
    tagline: 'Architectural feats, subarctic ice hotels, mountain cloud forests, and family wonderlands.',
    pinIds: [763, 15287, 520, 836, 5156, 3234, 3404],
  },
] as const;

export async function travelShelves(locale: Locale = DEFAULT_LOCALE): Promise<TravelShelf[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);
  const minConfidence = await timelineMinConfidence();

  type HotelRow = {
    pinId: number;
    rooms: number | null;
    service: number | null;
    location: number | null;
    cleanliness: number | null;
    value: number | null;
    acclaim: number | null;
    reviews: any;
    source: string;
    basis: string | null;
    sourceUrl: string | null;
    checkedAt: Date;
  };

  const hotelRows = await db.query<HotelRow>(
    `SELECT h."pinId",
            h."rooms"::float8, h."service"::float8, h."location"::float8,
            h."cleanliness"::float8, h."value"::float8, h."acclaim"::float8,
            h."reviews", h."source", h."basis", h."sourceUrl", h."checkedAt"
     FROM "PinHotel" h
     JOIN "Pin" p ON p.id = h."pinId"
     WHERE p."utcDeletedDateTime" IS NULL
       AND ($1::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $1) >= $1)
     ORDER BY COALESCE(h."acclaim", 0) DESC,
              (COALESCE(h."rooms", 0) + COALESCE(h."service", 0) + COALESCE(h."location", 0) + COALESCE(h."cleanliness", 0) + COALESCE(h."value", 0)) DESC`,
    [minConfidence],
  );

  if (!hotelRows.length) return [];

  const hotelMap = new Map<number, PinHotelJson>();
  for (const r of hotelRows) {
    hotelMap.set(r.pinId, {
      rooms: r.rooms,
      service: r.service,
      location: r.location,
      cleanliness: r.cleanliness,
      value: r.value,
      acclaim: r.acclaim,
      reviews: Array.isArray(r.reviews) ? r.reviews : [],
      source: r.source as any,
      basis: r.basis,
      sourceUrl: r.sourceUrl,
      checkedAt: new Date(r.checkedAt).toISOString(),
    });
  }

  const allIds = Array.from(hotelMap.keys());
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(allIds)).pins);
  await localizePins(loaded, locale);
  const pinById = new Map<number, PinJson>(loaded.map((p) => [p.id, p]));

  // Build resort items
  const resortsById = new Map<number, TravelResortPin>();
  for (const [id, pin] of pinById.entries()) {
    const hotel = hotelMap.get(id);
    if (!hotel) continue;
    const { destination, timing } = getBestTimeToGo(id);
    const rubricScore = computeRubricScore(hotel);
    const label = acclaimLabel(hotel.acclaim);
    const pricePerNight = getResortPricePerNight(
      id,
      pin.priceLowerBound ?? pin.price,
      pin.priceCurrency,
      pin.priceUpperBound,
    );

    resortsById.set(id, {
      ...pin,
      hotel,
      rubricScore,
      acclaimLabel: label,
      destination,
      bestTimeToGo: timing,
      pricePerNight,
      topActivities: getResortTopActivities(id),
    });
  }

  // Populate shelves
  const shelves: TravelShelf[] = [];
  const assigned = new Set<number>();

  for (const def of SHELF_DEFINITIONS) {
    const pins: TravelResortPin[] = [];
    for (const id of def.pinIds) {
      const resort = resortsById.get(id);
      if (resort) {
        pins.push(resort);
        assigned.add(id);
      }
    }
    // If shelf is Top Sanctuaries, keep all top curated.
    // For other shelves, preserve their themes.
    if (pins.length > 0) {
      shelves.push({
        id: def.id,
        name: def.name,
        label: def.label,
        tagline: def.tagline,
        pins,
      });
    }
  }

  // Any remaining resorts with rubrics not in predefined shelves go into an additional shelf or wonder retreats
  const remaining = allIds.filter((id) => !assigned.has(id)).map((id) => resortsById.get(id)).filter((p): p is TravelResortPin => !!p);
  if (remaining.length > 0) {
    const wonder = shelves.find((s) => s.id === 'wonder-retreats');
    if (wonder) {
      wonder.pins.push(...remaining);
    }
  }

  return shelves;
}
