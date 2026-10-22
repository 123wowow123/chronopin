// A pin's data-centre and industrial facility metrics (PinDatacenter, 0202):
// daily water draw, AI chip counts, H100-equivalents, physical footprint,
// cooling system, and permitted backup generators.
export type WaterBasis = 'published' | 'permitted' | 'estimated';

export const WATER_BASES: readonly WaterBasis[] = ['published', 'permitted', 'estimated'];

export type PinDatacenterJson = {
  waterGallonsPerDay: number | null;
  waterBasis: WaterBasis | null;
  chips: number | null;
  chipModel: string | null;
  h100Equivalents: number | null;
  acres: number | null;
  sqft: number | null;
  buildings: number | null;
  generators: number | null;
  cooling: string | null;
  powerSource: string | null;
  sourceUrl: string | null;
  note: string | null;
  checkedAt: string;
};

export const WATER_BASIS_WORDS: Record<WaterBasis, string> = {
  published: 'a day',
  permitted: 'a day permitted',
  estimated: 'a day estimated from MW (0.45 L/kWh WUE)',
};

// 500 -> "500 gal/d", 129000 -> "129K gal/d", 21000000 -> "21M gal/d".
export function formatWaterGallonsPerDay(gpd: number): string {
  if (gpd >= 1_000_000_000) return `${(Math.round(gpd / 10_000_000) / 100).toLocaleString('en-US')}B gal/d`;
  if (gpd >= 1_000_000) return `${(Math.round(gpd / 10_000) / 100).toLocaleString('en-US')}M gal/d`;
  if (gpd >= 1_000) return `${(Math.round(gpd / 100) / 10).toLocaleString('en-US')}K gal/d`;
  return `${Math.round(gpd).toLocaleString('en-US')} gal/d`;
}

// 25000 -> "25K", 1111673 -> "1.11M".
export function formatChips(count: number, chipModel?: string | null): string {
  const num =
    count >= 1_000_000
      ? `${(Math.round(count / 10_000) / 100).toLocaleString('en-US')}M`
      : count >= 1_000
        ? `${(Math.round(count / 100) / 10).toLocaleString('en-US')}K`
        : Math.round(count).toLocaleString('en-US');
  return chipModel ? `${num} ${chipModel}` : num;
}

// 320 -> "320 ac", 48500 -> "48.5K ac".
export function formatAcres(acres: number): string {
  if (acres >= 1_000_000) return `${(Math.round(acres / 10_000) / 100).toLocaleString('en-US')}M ac`;
  if (acres >= 10_000) return `${(Math.round(acres / 100) / 10).toLocaleString('en-US')}K ac`;
  return `${(Math.round(acres * 10) / 10).toLocaleString('en-US')} ac`;
}

// 250000 -> "250K sq ft", 4500000 -> "4.5M sq ft".
export function formatSqft(sqft: number): string {
  if (sqft >= 1_000_000) return `${(Math.round(sqft / 10_000) / 100).toLocaleString('en-US')}M sq ft`;
  if (sqft >= 1_000) return `${(Math.round(sqft / 100) / 10).toLocaleString('en-US')}K sq ft`;
  return `${Math.round(sqft).toLocaleString('en-US')} sq ft`;
}

// AI Data Center Map formula: MW * 1000 * 24h * 0.70 (IT power share) * 0.60 (utilization)
// = 10,080 kWh/day per MW; at 0.45 L/kWh WUE * 0.264172 gal/L = ~1,198.28 gal/day per MW.
export function estimateWaterGallonsPerDayFromMw(mw: number): number {
  return Math.round(mw * 1000 * 24 * 0.7 * 0.6 * 0.45 * 0.264172);
}

// AI Data Center Map household equivalent: daily kWh / (10,500 kWh/yr / 365 days) = ~350.4 homes/MW.
export function estimateHomesEquivalentFromMw(mw: number): number {
  return Math.round((mw * 1000 * 24 * 0.7 * 0.6) / (10500 / 365));
}

export type DatacenterSearchPill = { label: string; q: string };

// A figure's search: the range 25 either side of the figure rounded to the
// nearest 50 of its unit (150 MW -> mw:125-175, 788.4 GWh -> energy:775-825gwh),
// so the click lists pins about this size, this one among them.
function aroundNearest50(field: string, value: number | null | undefined, perUnit: number, unit: string): DatacenterSearchPill[] {
  if (value == null) return [];
  const centre = Math.max(50, Math.round(value / perUnit / 50) * 50);
  const q = `${field}:${centre - 25}-${centre + 25}${unit}`;
  return [{ label: `${centre} ${unit}`, q }];
}

export function datacenterSearchPills(
  dc: Pick<PinDatacenterJson, 'waterGallonsPerDay' | 'chips' | 'h100Equivalents' | 'acres' | 'sqft' | 'generators'>,
  power: { megawatts: number } | null | undefined,
  energy: { gwh: number } | null | undefined,
): Record<'power' | 'water' | 'chips' | 'energy' | 'acres' | 'sqft' | 'generators', DatacenterSearchPill[]> {
  return {
    power: aroundNearest50('mw', power?.megawatts, 1, 'mw'),
    water: aroundNearest50('water', dc.waterGallonsPerDay, 1e3, 'k'),
    chips: aroundNearest50('chips', dc.h100Equivalents ?? dc.chips, 1e3, 'k'),
    energy: aroundNearest50('energy', energy?.gwh, 1, 'gwh'),
    acres: aroundNearest50('acres', dc.acres, 1, ''),
    sqft: aroundNearest50('sqft', dc.sqft, 1e3, 'k'),
    generators: aroundNearest50('generators', dc.generators, 1, ''),
  };
}

// The cooling types a cooling architecture reads as, longest first so
// "direct-to-chip" is not split by "chip". Each one is a cooling: search.
const COOLING_KEYWORDS = [
  'direct-to-chip',
  'closed-loop',
  'once-through',
  'chilled water',
  'free-air',
  'air-cooled',
  'liquid',
  'immersion',
  'adiabatic',
  'evaporative',
  'seawater',
  'economization',
  'heat recovery',
  'hybrid',
  'waterless',
];
const COOLING_PATTERN = new RegExp(`(${[...COOLING_KEYWORDS].sort((a, b) => b.length - a.length).join('|')})`, 'gi');

export type KeywordSegment = { text: string; q?: string };
export type CoolingSegment = KeywordSegment;

function keywordSegments(text: string, pattern: RegExp, field: string): KeywordSegment[] {
  return text
    .split(pattern)
    .map((part, i) => (i % 2 === 1 ? { text: part, q: `${field}:"${part.toLowerCase()}"` } : { text: part }))
    .filter((seg) => seg.text);
}

// A cooling architecture split at its cooling types: the text of each type
// carries the search that lists the datacenters using it.
export function coolingSegments(cooling: string): KeywordSegment[] {
  return keywordSegments(cooling, COOLING_PATTERN, 'cooling');
}

// The grids and fuels a power source reads as, each a powersource: search.
const POWER_SOURCE_KEYWORDS = [
  'PJM',
  'MISO',
  'SPP',
  'SERC',
  'ERCOT',
  'utility grid',
  'transmission grid',
  'behind-the-meter',
  'BTM',
  'natural gas',
  'gas turbines',
  'gas',
  'diesel',
  'backup generators',
  'solar',
  'wind',
  'battery',
  'nuclear',
];
const POWER_SOURCE_PATTERN = new RegExp(`\\b(${[...POWER_SOURCE_KEYWORDS].sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');

export function powerSourceSegments(powerSource: string): KeywordSegment[] {
  return keywordSegments(powerSource, POWER_SOURCE_PATTERN, 'powersource');
}

// Tracker feeds write cooling as bare type · source words ("closed · water")
// and power as one-word fuels ("gas", "grid") or a "BTM:" prefix with no name.
// These spell them out; anything not recognised is left as it was.
const COOLING_WORDS: Record<string, string> = { closed: 'Closed-loop', water: 'water', hybrid: 'hybrid', air: 'air-cooled', liquid: 'liquid', evaporative: 'evaporative', adiabatic: 'adiabatic' };

export function normalizeCooling(cooling: string | null | undefined): string | null {
  const text = cooling?.trim();
  if (!text) return null;
  const words = text.split(/\s*·\s*/).map((w) => w.toLowerCase());
  if (!words.every((w) => w in COOLING_WORDS)) return text;
  const phrase = words.map((w) => COOLING_WORDS[w]).join(' ');
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} cooling`;
}

const POWER_WORDS: Record<string, string> = { gas: 'Natural gas', grid: 'Utility grid', solar: 'Solar', wind: 'Wind', nuclear: 'Nuclear', diesel: 'Diesel generators' };

export function normalizePowerSource(powerSource: string | null | undefined): string | null {
  const text = powerSource?.trim();
  if (!text) return null;
  const btm = /^BTM:\s*(.*)$/i.exec(text);
  if (btm) return btm[1].trim() ? `Behind-the-meter: ${btm[1].trim()}` : 'Behind-the-meter (generation not named)';
  const words = text.split(/\s*,\s*/).map((w) => w.toLowerCase());
  if (words.every((w) => w in POWER_WORDS)) {
    const phrase = words.map((w) => POWER_WORDS[w]).join(', ');
    return phrase;
  }
  return text;
}
