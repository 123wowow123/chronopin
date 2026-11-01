// C-IV15 © 2026 Chronopin. All rights reserved.
//
// C-IV15 is Chronopin's own 15%-hurdle price: the price at which a stock would
// return 15% a year for 15 years on a conservative owners'-earnings forecast.
// The shape published for the analyst-rated IV15 is followed (a multi-stage
// dividend model and a year-15 exit multiple are blended; owners' earnings are
// taken after the full cost of stock compensation; a fixed required return is
// used instead of WACC), but the estimate is made by Chronopin from filings and
// stated default assumptions.
export const C_IV15 = { name: 'C-IV15', copyright: '© 2026 Chronopin' } as const;
export const HURDLE = { rate: 0.15, years: 15, terminalGrowth: 0.03, exitMultiple: 12, blend: 0.5, maxGrowth: 0.25 } as const;

export type HurdleInputs = {
  // Owners' earnings for the year, in dollars: GAAP net income less the full cost of stock compensation.
  ownersEarnings: number;
  shares: number;
  // Cash and securities less financial debt, in dollars; may be negative.
  netCash: number;
  // Growth for years 1-5; it fades straight to terminalGrowth by year 10.
  growth: number;
  terminalGrowth?: number;
  exitMultiple?: number;
  // Weight on the dividend-model end point; the rest goes to the exit multiple.
  blend?: number;
};

export type HurdleResult = {
  price: number;
  dividendModel: number;
  exitModel: number;
  ownersEarningsPerShare: number;
};

// Growth for years 1-5: what revenue has done, held under what the capital
// earns (a business cannot outgrow its ROIC forever) and under maxGrowth.
export function sustainableGrowth(revenueGrowth: number | null, roic: number | null): number {
  const cap = Math.min(HURDLE.maxGrowth, roic != null && roic > 0 ? roic : HURDLE.terminalGrowth);
  return Math.max(0, Math.min(revenueGrowth ?? HURDLE.terminalGrowth, cap));
}

// Per-share owners' earnings for years 1..years: stage one at `growth`, a straight
// fade to the terminal rate across years 6-10, then the terminal rate.
export function earningsPath(first: number, growth: number, terminal: number, years: number = HURDLE.years): number[] {
  const out: number[] = [];
  let current = first;
  for (let year = 1; year <= years; year++) {
    out.push(current);
    const g = year < 5 ? growth : year < 10 ? growth + (terminal - growth) * ((year - 4) / 6) : terminal;
    current *= 1 + g;
  }
  return out;
}

// null when owners' earnings are not positive: no price pays 15% on a loss,
// the same "not investible" case that a negative IV15 marks.
export function hurdlePrice(input: HurdleInputs): HurdleResult | null {
  const { rate, years } = HURDLE;
  const terminal = input.terminalGrowth ?? HURDLE.terminalGrowth;
  const multiple = input.exitMultiple ?? HURDLE.exitMultiple;
  const blend = input.blend ?? HURDLE.blend;
  if (!(input.ownersEarnings > 0) || !(input.shares > 0) || !Number.isFinite(input.netCash)) return null;
  const perShare = input.ownersEarnings / input.shares;
  const path = earningsPath(perShare, input.growth, terminal, years);
  const stream = path.reduce((sum, oe, i) => sum + oe / (1 + rate) ** (i + 1), 0);
  const last = path[path.length - 1];
  const discount = (1 + rate) ** years;
  const cash = input.netCash / input.shares;
  const dividendModel = stream + (last * (1 + terminal)) / (rate - terminal) / discount + cash;
  const exitModel = stream + (last * multiple) / discount + cash;
  const price = blend * dividendModel + (1 - blend) * exitModel;
  return price > 0 ? { price, dividendModel, exitModel, ownersEarningsPerShare: perShare } : null;
}
