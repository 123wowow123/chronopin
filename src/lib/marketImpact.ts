// How far a pin's information can move markets (PinMarketImpact, 0253).
export type PinMarketImpactJson = { weight: number; reason: string; assets: string | null };

export type ImpactBand = 'high' | 'medium' | 'low';

// 7+ is a major mover (the card's icon turns hot), 3-6 notable, under 3 says
// nothing and gets no icon. Matches IMPACT_FLOOR / IMPACT_HIGH in bagSample.ts.
export function impactBand(weight: number | null | undefined): ImpactBand | null {
  if (weight == null || !Number.isFinite(weight) || weight < 3) return null;
  return weight >= 7 ? 'high' : weight >= 5 ? 'medium' : 'low';
}
