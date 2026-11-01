import { cScore, cTier } from '@/lib/cTier';
import { hurdlePrice, type HurdleResult } from '@/lib/hurdlePrice';
import type { Tier } from '@/lib/iv15Map';
import { extractFundamentals, hurdleInputs, nameKey, type CompanyFacts, type Fundamentals } from '@/lib/secFundamentals';
import { fetchMarketCap, identify, identifyCached } from './stocks';
import log from './util/log';

// C-IV15 (© 2026 Chronopin), the 15%-hurdle price, for any US-listed filer: SEC's XBRL company
// facts for the numbers, Nasdaq for the live price. EDGAR is keyless but wants
// a contact in the User-Agent: a project one, never the owner's address.
const HEADERS = { 'User-Agent': 'chronopin-dev/1.0 (contact@chronopin.local)', Accept: 'application/json' };
const DAY_MS = 24 * 3_600_000;

export type Hurdle = {
  symbol: string;
  price: number;
  hurdle: HurdleResult;
  // price ÷ hurdle price: above 1 the stock returns under 15% a year on these assumptions.
  ratio: number;
  growth: number;
  roic: number | null;
  fiscalYearEnd: string;
  cik: number;
  // The share of stock compensation charged: 1 is the full cost; the fallback
  // for a company the full charge turns to a loss is half, and says so.
  stockCompWeight: number;
  // Net debt is not taken off the value: it is large against earnings, and the
  // interest on it is already in net income.
  leveraged: boolean;
  // The share count came from market value ÷ price, not from the filings.
  sharesFromMarketCap: boolean;
  // Chronopin's own tier (null: Unrated) and 0-100 score, by rule from the filings (src/lib/cTier.ts).
  tier: Tier | null;
  score: number;
  sic: number | null;
};
export const FALLBACK_STOCK_COMP_WEIGHT = 0.5;

const memo = ((globalThis as any).__chronopinHurdleMemo ??= new Map<string, { at: number; value: Promise<unknown> }>()) as Map<string, { at: number; value: Promise<unknown> }>;
function once<T>(key: string, read: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.value as Promise<T>;
  const value = read();
  memo.set(key, { at: Date.now(), value });
  value.catch(() => memo.get(key)?.value === value && memo.delete(key));
  return value;
}

// null for a 404: a listed ticker with no company facts (an ETF, a trust) is an answer, not a failure.
async function sec<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`sec ${res.status} for ${url}`);
  return (await res.json()) as T;
}

type Listed = { cik_str: number; ticker: string; title: string };
const tickers = () => once('tickers2', () => sec<Record<string, Listed>>('https://www.sec.gov/files/company_tickers.json').then(r => new Map(Object.values(r ?? {}).map(l => [l.ticker.toUpperCase(), l] as const))));

const factsFor = (cik: number) => once(`fundamentals2|${cik}`, async () => {
  // Only the extracted numbers are kept: the raw facts run to several MB a filer.
  const facts = await sec<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`);
  return facts && extractFundamentals(facts);
});

// A holding company formed over an operating company takes over its ticker with
// a new CIK that has no filings yet (ExxonMobil Holdings Corp over Exxon Mobil
// Corp); the history stays under the old CIK. EDGAR's entity search finds
// candidates by name, kept when the name matches the listing's once legal and
// holding-company words are dropped. Several entities can share such a name, so
// the caller takes the first that has filings.
export async function predecessorCiks(title: string, own: number): Promise<number[]> {
  const key = nameKey(title);
  if (!key) return [];
  // "ExxonMobil" is searched as written and with the camel case split ("Exxon Mobil").
  const words = title.replace(/\b(holdings?|corp(oration)?|inc|co|company|group|plc|ltd|limited)\b\.?/gi, '').trim();
  const queries = [...new Set([words, words.replace(/([a-z])([A-Z])/g, '$1 $2')])].filter(Boolean);
  const out = new Set<number>();
  for (const query of queries) {
    const found = await sec<{ hits?: { hits?: { _id: string; _source: { entity: string } }[] } }>(`https://efts.sec.gov/LATEST/search-index?keysTyped=${encodeURIComponent(query)}`).catch(() => null);
    for (const h of found?.hits?.hits ?? []) if (Number(h._id) !== own && nameKey(h._source.entity) === key) out.add(Number(h._id));
  }
  return [...out];
}

export async function loadFundamentals(symbol: string): Promise<{ cik: number; fundamentals: Fundamentals } | null> {
  const listed = (await tickers()).get(symbol.toUpperCase().replace('.', '-'));
  if (!listed) return null;
  const own = await factsFor(listed.cik_str);
  if (own) return { cik: listed.cik_str, fundamentals: own };
  for (const cik of await once(`predecessors|${listed.cik_str}`, () => predecessorCiks(listed.title, listed.cik_str))) {
    const inherited = await factsFor(cik);
    if (inherited) return { cik, fundamentals: inherited };
  }
  return null;
}

// The SEC's industry code (SIC) for a filer, or null.
const sicFor = (cik: number) => once(`sic|${cik}`, async () => {
  const sub = await sec<{ sic?: string }>(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`);
  const sic = Number(sub?.sic);
  return Number.isFinite(sic) && sic > 0 ? sic : null;
});

// Nasdaq lists a dash-class ticker with a dot (BRK-B is BRK.B).
async function quoteFor(symbol: string) {
  return (await identifyCached(symbol).then(q => q ?? identify(symbol))) ?? (symbol.includes('-') ? identify(symbol.replace('-', '.')) : null);
}

// null for a symbol with no SEC 10-K facts (an ETF, a foreign filer, an OTC
// line), a loss-maker, a missing price, or a failed read.
export async function loadHurdle(symbol: string): Promise<Hurdle | null> {
  try {
    // A burst of lookups can leave an empty cached answer from Nasdaq: the quote is asked for again.
    const [found, quote] = await Promise.all([loadFundamentals(symbol), quoteFor(symbol)]);
    if (!found || !quote) return null;
    const price = quote.quote.price;
    // Without a usable count in the filings, the share count is market value over price.
    let shares = found.fundamentals.shares;
    let sharesFromMarketCap = false;
    if (shares == null) {
      const cap = await fetchMarketCap(quote.quote.symbol ?? symbol, quote.assetClass).catch(() => null);
      if (cap && price > 0) {
        shares = cap / price;
        sharesFromMarketCap = true;
      }
    }
    for (const stockCompWeight of [1, FALLBACK_STOCK_COMP_WEIGHT]) {
      const inputs = hurdleInputs(found.fundamentals, stockCompWeight, shares);
      const hurdle = inputs && hurdlePrice(inputs);
      if (inputs && hurdle) {
        const f = found.fundamentals;
        const sic = await sicFor(found.cik).catch(() => null);
        const ratio = price / hurdle.price;
        const grossMargin = f.grossProfit != null && f.revenue ? f.grossProfit / f.revenue : null;
        // An R&D line that is not reported is unknown, not zero.
        const rdIntensity = f.revenue && f.researchAndDevelopment != null ? f.researchAndDevelopment / f.revenue : null;
        const tier = cTier({ sic, roic: inputs.roic, grossMargin, rdIntensity, profitableAfterStockPay: stockCompWeight === 1 });
        const score = cScore({ ownersEarnings: inputs.ownersEarnings, netIncome: f.netIncome, tier, grossMargin, roic: inputs.roic, ratio });
        return { symbol, price, hurdle, ratio, growth: inputs.growth, roic: inputs.roic, fiscalYearEnd: f.fiscalYearEnd, cik: found.cik, stockCompWeight, leveraged: inputs.leveraged, sharesFromMarketCap, tier, score, sic };
      }
    }
    return null;
  } catch (e) {
    log.warn(`hurdle ${symbol}: ${(e as Error).message}`);
    return null;
  }
}
