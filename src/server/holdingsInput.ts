import { safeUrl } from '@/lib/people';
import type { Holding, HoldingsSnapshot } from '@/lib/holdings';
import { day } from './personInput';

export class HoldingsInputError extends Error {}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function text(v: unknown, max: number): string {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max) throw new HoldingsInputError(`Expected text of 1–${max} characters`);
  return v.trim();
}
function number(v: unknown, min: number, max: number): number | null {
  if (v == null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new HoldingsInputError('Invalid numeric holding or performance field');
  return v;
}
function url(v: unknown, required = false): string | null {
  if (v == null && !required) return null;
  const u = safeUrl(typeof v === 'string' ? v : null);
  if (!u) throw new HoldingsInputError('An HTTPS evidence URL is required');
  return u;
}
function date(v: unknown, required = false): string | null {
  if (v == null && !required) return null;
  const d = day(v);
  if (!d) throw new HoldingsInputError('A valid ISO date is required');
  if (d > new Date().toISOString().slice(0, 10)) throw new HoldingsInputError('Holdings and valuations cannot be future-dated');
  return d;
}
function holding(v: unknown): Holding {
  if (!record(v)) throw new HoldingsInputError('Invalid holding');
  const symbol = text(v.symbol, 20).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9.^:/-]{0,19}$/.test(symbol)) throw new HoldingsInputError('Invalid security symbol');
  const currency = text(v.currency ?? 'USD', 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new HoldingsInputError('Invalid currency');
  if (v.side != null && v.side !== 'long' && v.side !== 'short') throw new HoldingsInputError('Invalid position side');
  const costBasis = number(v.costBasis, 0, 1e15);
  const marketValue = number(v.marketValue, 0, 1e15);
  const costSourceUrl = url(v.costSourceUrl, costBasis != null);
  const valueSourceUrl = url(v.valueSourceUrl, marketValue != null);
  const valuationDate = date(v.valuationDate, marketValue != null);
  return { symbol, name: text(v.name, 300), currency, side: v.side === 'short' ? 'short' : 'long', weightPercent: number(v.weightPercent, 0, 100), shares: number(v.shares, 0, 1e15), costBasis, marketValue, costSourceUrl, valueSourceUrl, valuationDate };
}

export function readHoldings(body: unknown): HoldingsSnapshot[] {
  if (!record(body) || !Array.isArray(body.portfolios) || body.portfolios.length > 100) throw new HoldingsInputError('Expected portfolios array (up to 100)');
  const keys = new Set<string>();
  return body.portfolios.map((v: unknown) => {
    if (!record(v) || !['personal', 'fund', 'strategy'].includes(String(v.scope))) throw new HoldingsInputError('Invalid portfolio scope');
    const key = text(v.key, 120);
    if (keys.has(key)) throw new HoldingsInputError('Duplicate portfolio key');
    keys.add(key);
    if (!Array.isArray(v.holdings) || v.holdings.length > 2000) throw new HoldingsInputError('Expected holdings array (up to 2000)');
    const holdings = v.holdings.map(holding);
    if (new Set(holdings.map(h => `${h.symbol}:${h.side}`)).size !== holdings.length) throw new HoldingsInputError('Duplicate holding');
    const asOf = date(v.asOf, true)!;
    const checkedAt = date(v.checkedAt, true)!;
    if (checkedAt < asOf) throw new HoldingsInputError('Check date precedes holdings date');
    if (typeof v.complete !== 'boolean') throw new HoldingsInputError('Coverage must be explicit');
    const undisclosedCount = number(v.undisclosedCount, 0, 100000);
    if (undisclosedCount != null && !Number.isInteger(undisclosedCount)) throw new HoldingsInputError('Invalid undisclosed count');
    const undisclosedWeightPercent = number(v.undisclosedWeightPercent, 0, 100);
    if (v.complete && ((undisclosedCount ?? 0) > 0 || (undisclosedWeightPercent ?? 0) > 0)) throw new HoldingsInputError('Complete snapshot has undisclosed holdings');
    if (holdings.reduce((sum, h) => sum + (h.weightPercent ?? 0), undisclosedWeightPercent ?? 0) > 101) throw new HoldingsInputError('Portfolio weights exceed 100% beyond rounding');
    let performance: HoldingsSnapshot['performance'] = null;
    if (v.performance != null) {
      const p = v.performance;
      if (!record(p)) throw new HoldingsInputError('Invalid performance');
      performance = { asOf: date(p.asOf, true)!, startDate: date(p.startDate), monthly: number(p.monthly, -1, 1e6), ytd: number(p.ytd, -1, 1e6), oneYear: number(p.oneYear, -1, 1e6), allTime: number(p.allTime, -1, 1e6), disclosure: text(p.disclosure, 6000) };
      if (performance.asOf > checkedAt || (performance.startDate && performance.startDate > performance.asOf)) throw new HoldingsInputError('Invalid performance date range');
    }
    return { key, name: text(v.name, 300), scope: v.scope as HoldingsSnapshot['scope'], asOf, checkedAt, sourceUrl: url(v.sourceUrl, true)!, sourceDataUrl: url(v.sourceDataUrl), complete: v.complete, undisclosedCount, undisclosedWeightPercent, holdings, performance };
  });
}
