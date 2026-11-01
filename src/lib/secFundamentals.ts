import { sustainableGrowth, type HurdleInputs } from '@/lib/hurdlePrice';

// What the hurdle price needs from SEC's XBRL "company facts" for one filer:
// the latest full-year net income, stock compensation, revenue history, cash
// and debt, and the share count. A concept a filer does not report is null,
// and a null that matters makes the estimate null, never a guess.
type Fact = { start?: string; end: string; val: number; form: string; filed: string };
export type CompanyFacts = { facts?: Record<string, Record<string, { units?: Record<string, Fact[]> }>> };

export type Fundamentals = {
  fiscalYearEnd: string;
  netIncome: number | null;
  stockComp: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  // Gross profit and R&D expense for the year; null when not reported.
  grossProfit: number | null;
  researchAndDevelopment: number | null;
  cash: number | null;
  debt: number | null;
  equity: number | null;
  shares: number | null;
};

const REVENUE = ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax'];
const CASH = ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'];
const GROSS_PROFIT = ['GrossProfit'];
const COST_OF_REVENUE = ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold'];
const RESEARCH = ['ResearchAndDevelopmentExpense', 'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost', 'ResearchAndDevelopmentExpenseSoftwareExcludingAcquiredInProcessCost', 'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCostAndPurchasedTechnology'];
const SECURITIES = ['MarketableSecuritiesCurrent', 'ShortTermInvestments', 'AvailableForSaleSecuritiesDebtSecuritiesCurrent'];
const DEBT = ['LongTermDebt', 'LongTermDebtNoncurrent', 'DebtLongtermAndShorttermCombinedAmount'];
const SHORT_DEBT = ['LongTermDebtCurrent', 'ShortTermBorrowings', 'DebtCurrent'];

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 864e5;

// One value per fiscal year end, newest filing winning, for a duration concept
// that spans about a year (a quarter's or a cumulative stub is not a year). A
// filer can move to a different tag in a later year, so of the candidate tags the
// one reaching the newest year end is used (the first listed wins a tie).
function annual(facts: CompanyFacts, tags: string[], unit = 'USD'): Map<string, number> {
  let best = new Map<string, number>();
  let bestEnd = '';
  for (const tag of tags) {
    const rows = facts.facts?.['us-gaap']?.[tag]?.units?.[unit] ?? [];
    const out = new Map<string, { val: number; filed: string }>();
    for (const r of rows) {
      if (!r.start || !/^10-K/.test(r.form) || days(r.start, r.end) < 340 || days(r.start, r.end) > 390) continue;
      const hit = out.get(r.end);
      if (!hit || r.filed > hit.filed) out.set(r.end, { val: r.val, filed: r.filed });
    }
    const newest = [...out.keys()].sort().pop() ?? '';
    if (newest > bestEnd) {
      bestEnd = newest;
      best = new Map([...out].map(([end, v]) => [end, v.val]));
    }
  }
  return best;
}

// A balance-sheet value at a date, from the first concept that reports it.
function at(facts: CompanyFacts, tags: string[], end: string): number | null {
  for (const tag of tags) {
    const rows = (facts.facts?.['us-gaap']?.[tag]?.units?.USD ?? []).filter(r => r.end === end && /^10-K/.test(r.form));
    if (rows.length) return rows.reduce((a, b) => (b.filed > a.filed ? b : a)).val;
  }
  return null;
}

// The cover page's count when it is close to the fiscal year end, else the
// year's diluted (or basic) weighted average. Some filers leave the cover count
// out of the structured data, or stop at an old date (a dual-class filer such
// as Berkshire reports it per class, which these facts do not carry); null then,
// and the caller may derive a count from market value.
const STALE_DAYS = 400;
function shareCount(facts: CompanyFacts, end: string): number | null {
  const rows = facts.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? [];
  if (rows.length) {
    const latest = rows.reduce((a, b) => (b.end > a.end || (b.end === a.end && b.filed > a.filed) ? b : a));
    if (days(latest.end, end) <= STALE_DAYS) {
      // A company with several share classes reports one row per class.
      const total = rows.filter(r => r.end === latest.end && r.filed === latest.filed).reduce((sum, r) => sum + r.val, 0);
      if (total > 0) return total;
    }
  }
  return annual(facts, ['WeightedAverageNumberOfDilutedSharesOutstanding', 'WeightedAverageNumberOfSharesOutstandingBasic'], 'shares').get(end) ?? null;
}

export function extractFundamentals(facts: CompanyFacts): Fundamentals | null {
  const income = annual(facts, ['NetIncomeLoss', 'ProfitLoss']);
  const end = [...income.keys()].sort().pop();
  if (!end) return null;
  const revenue = annual(facts, REVENUE);
  const ends = [...revenue.keys()].sort();
  const newest = revenue.get(end) ?? null;
  // Three-year compound growth when the history is there.
  const back = ends.filter(e => e < end).slice(-3);
  const oldest = back.length === 3 ? revenue.get(back[0]) : null;
  const revenueGrowth = newest != null && oldest != null && oldest > 0 && newest > 0 ? (newest / oldest) ** (1 / 3) - 1 : null;
  const sum = (tags: string[]) => at(facts, tags, end);
  const cash = sum(CASH);
  const securities = sum(SECURITIES) ?? 0;
  const debt = (sum(DEBT) ?? 0) + (sum(SHORT_DEBT) ?? 0);
  return {
    fiscalYearEnd: end,
    netIncome: income.get(end) ?? null,
    stockComp: annual(facts, ['ShareBasedCompensation', 'AllocatedShareBasedCompensationExpense']).get(end) ?? 0,
    revenue: newest,
    revenueGrowth,
    grossProfit: annual(facts, GROSS_PROFIT).get(end) ?? (newest != null && annual(facts, COST_OF_REVENUE).get(end) != null ? newest - annual(facts, COST_OF_REVENUE).get(end)! : null),
    researchAndDevelopment: annual(facts, RESEARCH).get(end) ?? null,
    cash: cash != null ? cash + securities : null,
    debt,
    equity: sum(['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest']),
    shares: shareCount(facts, end),
  };
}

// Net debt above this many years of owners' earnings marks a company whose debt
// is its business (a utility, a lender, a lessor), not spare balance sheet.
export const LEVERAGED_NET_DEBT_YEARS = 8;

// Owners' earnings, net cash and growth from the fundamentals, or null when a
// required piece is missing. `stockCompWeight` is the share of the stock
// compensation expense charged against earnings: 1 is the full cost.
//
// Net cash is cash less debt, added to the value of the earnings. For a
// net-debt-heavy company that subtraction would count the debt twice: net income
// is already after the interest on it, so the earnings stream carries the cost.
// Such a company (`leveraged`) is valued on its earnings alone, with no net debt
// taken off; net cash is never negative then.
export function hurdleInputs(f: Fundamentals, stockCompWeight = 1, shares: number | null = f.shares): (HurdleInputs & { roic: number | null; leveraged: boolean }) | null {
  if (f.netIncome == null || shares == null || f.cash == null) return null;
  const ownersEarnings = f.netIncome - stockCompWeight * (f.stockComp ?? 0);
  const capital = f.equity != null ? f.equity + (f.debt ?? 0) - f.cash : null;
  const roic = capital != null && capital > 0 && ownersEarnings > 0 ? ownersEarnings / capital : null;
  const netCash = f.cash - (f.debt ?? 0);
  const leveraged = ownersEarnings > 0 && -netCash > LEVERAGED_NET_DEBT_YEARS * ownersEarnings;
  return { ownersEarnings, shares, netCash: leveraged ? 0 : netCash, growth: sustainableGrowth(f.revenueGrowth, roic), roic, leveraged };
}

// Lower-case name with the legal and holding-company words dropped, for matching
// a renamed holding company ("ExxonMobil Holdings Corp") to its predecessor
// ("EXXON MOBIL CORP"): spaces are ignored, camel case is not split.
const NAME_NOISE = new Set(['holdings', 'holding', 'corp', 'corporation', 'inc', 'co', 'company', 'group', 'plc', 'ltd', 'limited', 'the', 'sa', 'nv', 'llc', 'lp']);
export function nameKey(name: string): string {
  return name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !NAME_NOISE.has(w)).join('');
}
