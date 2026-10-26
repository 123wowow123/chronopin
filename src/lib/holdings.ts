// Dated disclosures, fund positions and tracked strategies are separate scopes.
// A transaction range or a strategy return is never a position's cost basis.
export type Holding = {
  symbol: string;
  name: string;
  weightPercent: number | null;
  shares: number | null;
  side: 'long' | 'short';
  currency: string;
  costBasis: number | null;
  marketValue: number | null;
  valuationDate: string | null;
  costSourceUrl: string | null;
  valueSourceUrl: string | null;
};
export type HoldingsSnapshot = {
  key: string;
  name: string;
  scope: 'personal' | 'fund' | 'strategy';
  asOf: string;
  checkedAt: string;
  sourceUrl: string;
  sourceDataUrl: string | null;
  complete: boolean;
  undisclosedCount: number | null;
  undisclosedWeightPercent: number | null;
  holdings: Holding[];
  performance: {
    asOf: string;
    startDate: string | null;
    monthly: number | null;
    ytd: number | null;
    oneYear: number | null;
    allTime: number | null;
    disclosure: string;
  } | null;
};

export function holdingPnl(holding: Holding): { amount: number; percent: number } | null {
  const { costBasis, marketValue } = holding;
  if (costBasis == null || marketValue == null || costBasis <= 0 || !Number.isFinite(costBasis) || !Number.isFinite(marketValue) || marketValue < 0 || !holding.valuationDate || !holding.costSourceUrl || !holding.valueSourceUrl) return null;
  const amount = (marketValue - costBasis) * (holding.side === 'short' ? -1 : 1);
  return { amount, percent: amount / costBasis * 100 };
}

export function holdingsAreStale(asOf: string, today: string): boolean {
  return Date.parse(today) - Date.parse(asOf) > 7 * 864e5;
}
