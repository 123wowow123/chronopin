import { describe, expect, it } from 'vitest';
import { extractFundamentals, hurdleInputs, nameKey, toUsd, withIfrsAliases, type CompanyFacts, type Fundamentals } from './secFundamentals';

const yr = (end: string, val: number, filed = `${end.slice(0, 4)}-12-31`) => ({ start: `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`, end, val, form: '10-K', filed });
const bal = (end: string, val: number) => ({ end, val, form: '10-K', filed: `${end.slice(0, 4)}-12-31` });

const facts: CompanyFacts = {
  facts: {
    dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ end: '2026-02-01', val: 40, form: '10-K', filed: '2026-02-10' }, { end: '2026-02-01', val: 10, form: '10-K', filed: '2026-02-10' }] } } },
    'us-gaap': {
      NetIncomeLoss: { units: { USD: [yr('2026-12-31', 500), yr('2025-12-31', 400)] } },
      ShareBasedCompensation: { units: { USD: [yr('2026-12-31', 100)] } },
      Revenues: { units: { USD: [yr('2023-12-31', 1000), yr('2024-12-31', 1100), yr('2025-12-31', 1210), yr('2026-12-31', 1331), { start: '2026-01-01', end: '2026-03-31', val: 5, form: '10-Q', filed: '2026-04-30' }] } },
      CashAndCashEquivalentsAtCarryingValue: { units: { USD: [bal('2026-12-31', 300)] } },
      MarketableSecuritiesCurrent: { units: { USD: [bal('2026-12-31', 100)] } },
      LongTermDebt: { units: { USD: [bal('2026-12-31', 150)] } },
      StockholdersEquity: { units: { USD: [bal('2026-12-31', 1000)] } },
    },
  },
};

describe('extractFundamentals', () => {
  it('reads the latest full year, three-year growth, cash plus securities, debt, and summed share classes', () => {
    const f = extractFundamentals(facts)!;
    expect(f.fiscalYearEnd).toBe('2026-12-31');
    expect(f.netIncome).toBe(500);
    expect(f.stockComp).toBe(100);
    expect(f.revenue).toBe(1331);
    expect(f.revenueGrowth).toBeCloseTo(0.1, 6);
    expect(f.cash).toBe(400);
    expect(f.debt).toBe(150);
    expect(f.shares).toBe(50);
  });
  it('falls back to the diluted weighted average when the cover count is missing', () => {
    const noCover: CompanyFacts = { facts: { ...facts.facts, dei: {}, 'us-gaap': { ...facts.facts!['us-gaap'], WeightedAverageNumberOfDilutedSharesOutstanding: { units: { shares: [yr('2026-12-31', 77)] } } } } };
    expect(extractFundamentals(noCover)!.shares).toBe(77);
  });
  it('is null with no annual net income', () => {
    expect(extractFundamentals({ facts: {} })).toBeNull();
  });
});

describe('hurdleInputs', () => {
  it('takes stock compensation out of net income, nets debt from cash, and caps growth at ROIC', () => {
    const i = hurdleInputs(extractFundamentals(facts)!)!;
    expect(i.ownersEarnings).toBe(400);
    expect(i.netCash).toBe(250);
    // Capital 1000 + 150 - 400 = 750, so ROIC 400 / 750.
    expect(i.roic).toBeCloseTo(400 / 750, 6);
    expect(i.growth).toBeCloseTo(0.1, 6);
  });
  it('charges only the weighted share of stock compensation', () => {
    expect(hurdleInputs(extractFundamentals(facts)!, 0.5)!.ownersEarnings).toBe(450);
  });
  it('is null without cash or shares', () => {
    const f = extractFundamentals(facts)!;
    expect(hurdleInputs({ ...f, cash: null })).toBeNull();
    expect(hurdleInputs({ ...f, shares: null })).toBeNull();
  });
});

describe('a filer that changes tag', () => {
  it('uses the tag that reaches the newest year', () => {
    const moved: CompanyFacts = { facts: { ...facts.facts, 'us-gaap': { ...facts.facts!['us-gaap'], NetIncomeLoss: { units: { USD: [yr('2025-12-31', 400)] } }, ProfitLoss: { units: { USD: [yr('2025-12-31', 400), yr('2026-12-31', 520)] } } } } };
    const f = extractFundamentals(moved)!;
    expect(f.fiscalYearEnd).toBe('2026-12-31');
    expect(f.netIncome).toBe(520);
  });
});

describe('stale share counts', () => {
  const stale: CompanyFacts = { facts: { ...facts.facts, dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ end: '2011-04-29', val: 941481, form: '10-Q', filed: '2011-05-05' }] } } }, 'us-gaap': { ...facts.facts!['us-gaap'], WeightedAverageNumberOfSharesOutstandingBasic: { units: { shares: [yr('2026-12-31', 60)] } } } } };
  it('ignores a cover count far from the fiscal year end and uses the weighted average', () => {
    expect(extractFundamentals(stale)!.shares).toBe(60);
  });
  it('is null when neither is usable, so the caller can derive a count from market value', () => {
    const none: CompanyFacts = { facts: { ...facts.facts, dei: stale.facts!.dei } };
    expect(extractFundamentals(none)!.shares).toBeNull();
  });
});

describe('leveraged treatment', () => {
  const base: Fundamentals = { fiscalYearEnd: '2026-12-31', netIncome: 100, stockComp: 0, revenue: null, revenueGrowth: null, grossProfit: null, researchAndDevelopment: null, currency: 'USD', foreign: false, cash: 10, debt: 20, equity: 500, shares: 10 };
  it('takes net debt off the value for an ordinary balance sheet', () => {
    const i = hurdleInputs(base)!;
    expect(i.leveraged).toBe(false);
    expect(i.netCash).toBe(-10);
  });
  it('values a net-debt-heavy company on its earnings alone, since interest is already in net income', () => {
    const i = hurdleInputs({ ...base, cash: 0, debt: 900 })!;
    expect(i.leveraged).toBe(true);
    expect(i.netCash).toBe(0);
  });
  it('takes a share count passed in over the filed one', () => {
    expect(hurdleInputs(base, 1, 77)!.shares).toBe(77);
  });
});

describe('nameKey', () => {
  it('matches a holding company to its predecessor and ignores legal words and spacing', () => {
    expect(nameKey('ExxonMobil Holdings Corp')).toBe(nameKey('EXXON MOBIL CORP'));
    expect(nameKey('Apple Inc.')).toBe('apple');
    expect(nameKey('The Coca-Cola Company')).toBe('cocacola');
  });
});

// A foreign private issuer: IFRS tags, a 20-F, income in another currency.
const ifrsYear = (end: string, val: number, unit = 'TWD', form = '20-F') => ({ start: `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`, end, val, form, filed: `${end.slice(0, 4)}-12-31` });
const foreignFacts: CompanyFacts = {
  facts: {
    dei: {},
    'ifrs-full': {
      ProfitLossAttributableToOwnersOfParent: { units: { TWD: [ifrsYear('2026-06-30', 1000)] } },
      Revenue: { units: { TWD: [ifrsYear('2026-06-30', 5000), ifrsYear('2025-06-30', 4000), ifrsYear('2024-06-30', 3000), ifrsYear('2023-06-30', 2000)] } },
      GrossProfit: { units: { TWD: [ifrsYear('2026-06-30', 2500)] } },
      ResearchAndDevelopmentExpense: { units: { TWD: [ifrsYear('2026-06-30', 400)] } },
      CashAndCashEquivalents: { units: { TWD: [{ end: '2026-06-30', val: 3000, form: '20-F', filed: '2026-12-31' }] } },
      Borrowings: { units: { TWD: [{ end: '2026-06-30', val: 1000, form: '20-F', filed: '2026-12-31' }] } },
      EquityAttributableToOwnersOfParent: { units: { TWD: [{ end: '2026-06-30', val: 9000, form: '20-F', filed: '2026-12-31' }] } },
    },
  },
};

describe('a foreign private issuer (20-F, IFRS)', () => {
  const today = new Date('2026-11-01');
  it('reads IFRS tags in the filer\'s currency and marks the filer foreign', () => {
    const f = extractFundamentals(foreignFacts, today)!;
    expect(f.currency).toBe('TWD');
    expect(f.foreign).toBe(true);
    expect(f.netIncome).toBe(1000);
    expect(f.revenue).toBe(5000);
    expect(f.grossProfit).toBe(2500);
    expect(f.researchAndDevelopment).toBe(400);
    expect(f.cash).toBe(3000);
    expect(f.debt).toBe(1000);
    expect(f.equity).toBe(9000);
    expect(f.revenueGrowth).toBeCloseTo((5000 / 2000) ** (1 / 3) - 1, 6);
  });
  it('does not overwrite a US GAAP tag the filer has itself', () => {
    const both: CompanyFacts = { facts: { 'us-gaap': { NetIncomeLoss: { units: { USD: [{ start: '2025-01-01', end: '2025-12-31', val: 7, form: '20-F', filed: '2026-03-01' }] } } }, 'ifrs-full': foreignFacts.facts!['ifrs-full'] } };
    expect(withIfrsAliases(both).facts!['us-gaap'].NetIncomeLoss.units!.USD[0].val).toBe(7);
  });
  it('converts every money field to dollars and leaves ratios and counts alone', () => {
    const f = toUsd({ ...extractFundamentals(foreignFacts, today)!, shares: 50 }, 10);
    expect(f.currency).toBe('USD');
    expect(f.netIncome).toBe(100);
    expect(f.cash).toBe(300);
    expect(f.debt).toBe(100);
    expect(f.shares).toBe(50);
  });
  it('treats a filer whose last annual report is too old as stale, a foreign one later than a US one', () => {
    expect(extractFundamentals(foreignFacts, new Date('2028-08-01'))).toBeNull();
    // About 22 months after the year end: stale for a 10-K filer, still allowed for a 20-F filer.
    expect(extractFundamentals(foreignFacts, new Date('2028-04-20'))).not.toBeNull();
    expect(extractFundamentals(facts, new Date('2028-10-30'))).toBeNull();
  });
  it('prefers US dollars when the filer gives them for the newest year too', () => {
    const both: CompanyFacts = { facts: { ...foreignFacts.facts, 'ifrs-full': { ...foreignFacts.facts!['ifrs-full'], ProfitLossAttributableToOwnersOfParent: { units: { TWD: [ifrsYear('2026-06-30', 1000)], USD: [ifrsYear('2026-06-30', 31, 'USD')] } } } } };
    const f = extractFundamentals(both, new Date('2026-11-01'))!;
    expect(f.currency).toBe('USD');
    expect(f.netIncome).toBe(31);
  });
});
