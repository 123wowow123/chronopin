// The "Earnings Trends" panel on an earnings pin: EPS against the analysts'
// estimate, and revenue against earnings with the profit margin. Read from
// Nasdaq's public company API (the same figures Yahoo Finance shows). Pure:
// the server fetches (src/server/earningsTrends.ts).

export type EpsQuarter = {
  // The fiscal quarter's end as Nasdaq words it ("Jun 2026").
  label: string;
  // YYYY-MM-DD of the month's last day, for ordering.
  end: string;
  // The day it was reported (YYYY-MM-DD), null when still to come.
  reported: string | null;
  estimate: number | null;
  actual: number | null;
};

export type RevenuePeriod = {
  label: string;
  end: string;
  revenue: number;
  // Net income applicable to common shareholders (Yahoo's "Earnings"), else net income.
  earnings: number | null;
};

export type EarningsTrends = {
  // The company ticker, empty for a company with no US listing.
  symbol: string;
  // The company's name, for the search pills of an unlisted company.
  company?: string;
  // Where the money figures come from and their currency; Nasdaq's are US dollars and carry neither.
  source?: 'wikidata' | 'manual';
  currency?: string;
  eps: EpsQuarter[];
  quarterly: RevenuePeriod[];
  annual: RevenuePeriod[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Nasdaq's money cells: "$319,716" (thousands), "-$1,656", "--" for none.
export function nasdaqThousands(cell: unknown): number | null {
  if (typeof cell !== 'string') return null;
  const m = /^(-?)\$?\s*(-?)([\d,]+(?:\.\d+)?)$/.exec(cell.trim());
  if (!m) return null;
  const n = Number(m[3].replace(/,/g, ''));
  return Number.isFinite(n) ? (m[1] || m[2] ? -n : n) * 1000 : null;
}

const num = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || !/^-?\d+(\.\d+)?$/.test(v.trim())) return null;
  return Number(v);
};

// "Jun 2026" -> "2026-06-30".
function monthEnd(label: string): string | null {
  const m = /^([A-Za-z]{3}) (\d{4})$/.exec(label.trim());
  const month = m ? MONTHS.indexOf(m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) : -1;
  if (!m || month < 0) return null;
  const last = new Date(Date.UTC(Number(m[2]), month + 1, 0)).getUTCDate();
  return `${m[2]}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

// "8/10/2026" -> "2026-08-10".
function usDay(text: unknown): string | null {
  const m = typeof text === 'string' ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim()) : null;
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

type SurpriseRow = { fiscalQtrEnd?: string; dateReported?: string; eps?: unknown; consensusForecast?: unknown };
type ForecastRow = { fiscalEnd?: string; consensusEPSForecast?: unknown };
type FinanceRows = { headers?: Record<string, string>; rows?: Record<string, string>[] };

// Reported quarters (oldest first) with the quarters Nasdaq has a consensus
// for after them. Fewer than one reported quarter is nothing worth a chart.
export function epsQuarters(surprise: SurpriseRow[] | undefined, forecast: ForecastRow[] | undefined): EpsQuarter[] {
  const out: EpsQuarter[] = [];
  for (const row of surprise ?? []) {
    const end = monthEnd(row.fiscalQtrEnd ?? '');
    const actual = num(row.eps);
    if (!end || actual == null) continue;
    out.push({ label: row.fiscalQtrEnd!, end, reported: usDay(row.dateReported), estimate: num(row.consensusForecast), actual });
  }
  const newest = out.reduce((a, q) => (q.end > a ? q.end : a), '');
  for (const row of forecast ?? []) {
    const end = monthEnd(row.fiscalEnd ?? '');
    if (!end || end <= newest || out.some((q) => q.end === end)) continue;
    out.push({ label: row.fiscalEnd!, end, reported: null, estimate: num(row.consensusEPSForecast), actual: null });
  }
  return out.sort((a, b) => a.end.localeCompare(b.end));
}

// Revenue and earnings per period from Nasdaq's income statement, oldest first.
export function revenuePeriods(table: FinanceRows | undefined): RevenuePeriod[] {
  const rows = table?.rows ?? [];
  const find = (name: string) => rows.find((r) => r.value1 === name);
  const revenue = find('Total Revenue');
  const earnings = find('Net Income Applicable to Common Shareholders') ?? find('Net Income');
  if (!revenue) return [];
  const out: RevenuePeriod[] = [];
  for (const key of ['value2', 'value3', 'value4', 'value5']) {
    const header = table?.headers?.[key];
    const day = usDay(header);
    const rev = nasdaqThousands(revenue[key]);
    if (!day || rev == null || rev <= 0) continue;
    const [y, m] = day.split('-');
    out.push({ label: `${MONTHS[Number(m) - 1]} ${y}`, end: day, revenue: rev, earnings: earnings ? nasdaqThousands(earnings[key]) : null });
  }
  return out.sort((a, b) => a.end.localeCompare(b.end));
}

// Profit margin as a percentage, null when there is no earnings figure.
export const margin = (p: RevenuePeriod): number | null => (p.earnings == null ? null : (p.earnings / p.revenue) * 100);

export type Verdict = 'beat' | 'miss' | 'met';
// Beat or miss against the estimate, to the cent (EPS is reported in cents).
export function verdict(q: EpsQuarter): { verdict: Verdict; diff: number } | null {
  if (q.actual == null || q.estimate == null) return null;
  const diff = Math.round((q.actual - q.estimate) * 100) / 100;
  return { verdict: diff > 0 ? 'beat' : diff < 0 ? 'miss' : 'met', diff };
}

// A round top (and bottom) for a value axis so the gridlines land on tidy values.
export function niceStep(span: number, lines: number): number {
  const raw = span / Math.max(lines, 1);
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  for (const s of [1, 2, 2.5, 5, 10]) if (s * mag >= raw) return s * mag;
  return 10 * mag;
}

export function parseTrends(symbol: string, data: { surprise?: SurpriseRow[]; forecast?: ForecastRow[]; quarterly?: FinanceRows; annual?: FinanceRows }): EarningsTrends | null {
  const eps = epsQuarters(data.surprise, data.forecast);
  const quarterly = revenuePeriods(data.quarterly);
  const annual = revenuePeriods(data.annual);
  if (!eps.some((q) => q.actual != null) && !quarterly.length) return null;
  return { symbol, eps, quarterly, annual };
}

// Annual revenue and earnings kept in src/server/data/earningsAnnual.json for companies Nasdaq cannot chart.
export type AnnualEntry = { source: 'wikidata' | 'manual'; currency: string; periods: { year: number; revenue: number; earnings: number | null }[] };

export function annualPeriods(entry: AnnualEntry): RevenuePeriod[] {
  return [...entry.periods]
    .sort((a, b) => a.year - b.year)
    .map((p) => ({ label: String(p.year), end: `${p.year}-12-31`, revenue: p.revenue, earnings: p.earnings }));
}

// Nasdaq's figures, with the kept annual ones filling what Nasdaq lacks: all of it for an
// unlisted company, the income statement for an ADR that has only EPS. Nasdaq's own
// income statement always wins (it is quarterly and current).
export function withAnnual(trends: EarningsTrends | null, entry: AnnualEntry | null, company: string, symbol: string): EarningsTrends | null {
  if (trends && (trends.quarterly.length || trends.annual.length)) return { ...trends, company };
  if (!entry) return trends ? { ...trends, company } : null;
  return { symbol, company, eps: trends?.eps ?? [], quarterly: [], annual: annualPeriods(entry), source: entry.source, currency: entry.currency };
}
