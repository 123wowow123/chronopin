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
