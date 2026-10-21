// The totals the map shows under its filters for the pins on it. Every stat is
// data-driven: it appears once enough of the shown pins carry its number, so a
// data-centre search gets MW, Cost, Water, Chips and Acres, an anime one gets
// Episodes and Rating, an economy one gets prediction-market dollars - no
// per-category table.
import { formatAcres, formatChips, formatSqft, formatWaterGallonsPerDay } from '@/lib/datacenter';
import { formatMegawatts } from '@/lib/power';
import { money } from '@/lib/format';
import type { MapPinJson } from '@/lib/types';

export type MapStat = {
  key: string;
  labelKey:
    | 'statPins'
    | 'statCost'
    | 'statMedianCost'
    | 'statMW'
    | 'statMWGen'
    | 'statMWUse'
    | 'statMWStore'
    | 'statWater'
    | 'statChips'
    | 'statAcres'
    | 'statSqft'
    | 'statGenerators'
    | 'statMarket'
    | 'statEpisodes'
    | 'statRating'
    | 'statTicket';
  value: string;
  tone: string;
  have: number;
};

// How many pins must carry a number before its stat is worth showing.
const MIN_PINS = {
  cost: 1,
  megawatts: 1,
  water: 1,
  chips: 1,
  acres: 1,
  sqft: 1,
  generators: 1,
  marketVolume: 3,
  episodes: 5,
  rating: 5,
  tickets: 5,
} as const;
// Pins plus at most this many more on a single-row strip, or up to MAX_DC_EXTRA when
// data-centre metrics (water, chips, footprint, generators) are present.
const MAX_EXTRA = 3;
const MAX_DC_EXTRA = 7;

const positive = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const mean = (values: number[]) => sum(values) / values.length;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function mapStats(pins: MapPinJson[], numberLocale = 'en-US'): MapStat[] {
  const usd = pins.flatMap((pin) => (pin.priceCurrency === 'USD' ? [positive(pin.price)] : [])).filter((n): n is number => n != null);
  const mwOf = (kind: 'generation' | 'usage' | 'storage') =>
    pins.filter((pin) => (pin.powerKind ?? 'usage') === kind).map((pin) => positive(pin.megawatts)).filter((n): n is number => n != null);
  const mwGen = mwOf('generation');
  const mwUse = mwOf('usage');
  const mwStore = mwOf('storage');
  const water = pins.map((pin) => positive(pin.waterGallonsPerDay)).filter((n): n is number => n != null);
  const chips = pins.map((pin) => positive(pin.chips)).filter((n): n is number => n != null);
  const acres = pins.map((pin) => positive(pin.acres)).filter((n): n is number => n != null);
  const sqft = pins.map((pin) => positive(pin.sqft)).filter((n): n is number => n != null);
  const generators = pins.map((pin) => positive(pin.generators)).filter((n): n is number => n != null);
  const market = pins.map((pin) => positive(pin.marketVolume)).filter((n): n is number => n != null);
  const episodes = pins.map((pin) => positive(pin.episodeCount)).filter((n): n is number => n != null);
  const rating = pins.map((pin) => positive(pin.ratingPercent)).filter((n): n is number => n != null);
  const tickets = pins.map((pin) => positive(pin.ticketLowUsd)).filter((n): n is number => n != null);

  const extra: MapStat[] = [];
  if (usd.length >= MIN_PINS.cost) {
    // A sum is dominated by one outlier (an $8.8T property), so a group with
    // one says its median instead.
    const skewed = usd.length > 2 && Math.max(...usd) > 100 * median(usd);
    extra.push({ key: 'cost', labelKey: skewed ? 'statMedianCost' : 'statCost', value: money(skewed ? median(usd) : sum(usd), 'USD'), tone: 'text-success', have: usd.length });
  }
  // Power made and power drawn are different totals; a sum of both says nothing.
  if (mwGen.length >= MIN_PINS.megawatts) extra.push({ key: 'mwGen', labelKey: 'statMWGen', value: formatMegawatts(sum(mwGen)), tone: 'text-success', have: mwGen.length });
  if (mwUse.length >= MIN_PINS.megawatts) extra.push({ key: 'mwUse', labelKey: 'statMWUse', value: formatMegawatts(sum(mwUse)), tone: 'text-past', have: mwUse.length });
  if (mwStore.length >= MIN_PINS.megawatts) extra.push({ key: 'mwStore', labelKey: 'statMWStore', value: formatMegawatts(sum(mwStore)), tone: 'text-link', have: mwStore.length });
  if (water.length >= MIN_PINS.water) extra.push({ key: 'water', labelKey: 'statWater', value: formatWaterGallonsPerDay(sum(water)), tone: 'text-link', have: water.length });
  if (chips.length >= MIN_PINS.chips) extra.push({ key: 'chips', labelKey: 'statChips', value: formatChips(sum(chips)), tone: 'text-future', have: chips.length });
  if (acres.length >= MIN_PINS.acres) extra.push({ key: 'acres', labelKey: 'statAcres', value: formatAcres(sum(acres)), tone: 'text-past', have: acres.length });
  if (sqft.length >= MIN_PINS.sqft) extra.push({ key: 'sqft', labelKey: 'statSqft', value: formatSqft(sum(sqft)), tone: 'text-past', have: sqft.length });
  if (generators.length >= MIN_PINS.generators) extra.push({ key: 'generators', labelKey: 'statGenerators', value: Math.round(sum(generators)).toLocaleString(numberLocale), tone: 'text-past', have: generators.length });
  if (market.length >= MIN_PINS.marketVolume) extra.push({ key: 'market', labelKey: 'statMarket', value: money(sum(market), 'USD'), tone: 'text-future', have: market.length });
  if (episodes.length >= MIN_PINS.episodes) extra.push({ key: 'episodes', labelKey: 'statEpisodes', value: Math.round(sum(episodes)).toLocaleString(numberLocale), tone: 'text-link', have: episodes.length });
  if (rating.length >= MIN_PINS.rating) extra.push({ key: 'rating', labelKey: 'statRating', value: `${Math.round(mean(rating))}%`, tone: 'text-past', have: rating.length });
  if (tickets.length >= MIN_PINS.tickets) extra.push({ key: 'tickets', labelKey: 'statTicket', value: money(Math.round(mean(tickets)), 'USD'), tone: 'text-success', have: tickets.length });

  const hasDcStats = water.length > 0 || chips.length > 0 || acres.length > 0 || sqft.length > 0 || generators.length > 0;
  // Most widely carried first, so the row says what most of the pins have.
  extra.sort((a, b) => b.have - a.have);
  return [
    { key: 'pins', labelKey: 'statPins', value: pins.length.toLocaleString(numberLocale), tone: 'text-link', have: pins.length },
    ...extra.slice(0, hasDcStats ? MAX_DC_EXTRA : MAX_EXTRA),
  ];
}
