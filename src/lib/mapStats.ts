// The totals the map shows under its filters for the pins on it. Every stat is
// data-driven: it appears once enough of the shown pins carry its number, so a
// data-centre search gets MW and Cost, an anime one gets Episodes and Rating,
// an economy one gets prediction-market dollars - no per-category table.
import { formatMegawatts } from '@/lib/power';
import { money } from '@/lib/format';
import type { MapPinJson } from '@/lib/types';

export type MapStat = { key: string; labelKey: 'statPins' | 'statCost' | 'statMedianCost' | 'statMW' | 'statMWGen' | 'statMWUse' | 'statMWStore' | 'statMarket' | 'statEpisodes' | 'statRating' | 'statTicket'; value: string; tone: string; have: number };

// How many pins must carry a number before its stat is worth showing.
const MIN_PINS = { cost: 1, megawatts: 1, marketVolume: 3, episodes: 5, rating: 5, tickets: 5 } as const;
// Pins plus at most this many more, so the row stays on one line.
const MAX_EXTRA = 3;

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
  if (market.length >= MIN_PINS.marketVolume) extra.push({ key: 'market', labelKey: 'statMarket', value: money(sum(market), 'USD'), tone: 'text-future', have: market.length });
  if (episodes.length >= MIN_PINS.episodes) extra.push({ key: 'episodes', labelKey: 'statEpisodes', value: Math.round(sum(episodes)).toLocaleString(numberLocale), tone: 'text-link', have: episodes.length });
  if (rating.length >= MIN_PINS.rating) extra.push({ key: 'rating', labelKey: 'statRating', value: `${Math.round(mean(rating))}%`, tone: 'text-past', have: rating.length });
  if (tickets.length >= MIN_PINS.tickets) extra.push({ key: 'tickets', labelKey: 'statTicket', value: money(Math.round(mean(tickets)), 'USD'), tone: 'text-success', have: tickets.length });

  // Most widely carried first, so the row says what most of the pins have.
  extra.sort((a, b) => b.have - a.have);
  return [{ key: 'pins', labelKey: 'statPins', value: pins.length.toLocaleString(numberLocale), tone: 'text-link', have: pins.length }, ...extra.slice(0, MAX_EXTRA)];
}
