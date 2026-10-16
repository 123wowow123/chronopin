// Reads the filings a script sends to POST /api/admin/person-trades: every
// value is checked, so what reaches the table is what the page can render.

import { safeUrl } from '@/lib/people';
import type { ParsedTrade, TradeOwner, TradeType } from '@/lib/trades';
import type { TradeFiling } from './model/personTrade';

export type FilingInput = TradeFiling & { personId?: number; bioguideId?: string };

const OWNERS: TradeOwner[] = ['self', 'spouse', 'joint', 'dependent'];
const TYPES: TradeType[] = ['purchase', 'sale', 'partial', 'exchange'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const day = (v: unknown) => (typeof v === 'string' && DAY.test(v) ? v : null);
const money = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);

export function readFilings(raw: unknown): FilingInput[] {
  if (!Array.isArray(raw)) throw new Error('filings must be an array');
  if (raw.length > 500) throw new Error('at most 500 filings per request');
  return raw.map((f, i) => {
    const e = (f ?? {}) as Record<string, unknown>;
    const chamber = e.chamber === 'senate' ? 'senate' : e.chamber === 'house' ? 'house' : null;
    const filingId = typeof e.filingId === 'string' ? e.filingId.slice(0, 40) : '';
    const sourceUrl = safeUrl(typeof e.sourceUrl === 'string' ? e.sourceUrl : null);
    if (!chamber || !filingId || !sourceUrl) throw new Error(`filing ${i}: chamber, filingId and an https sourceUrl are required`);
    if (!Array.isArray(e.trades) || e.trades.length > 2000) throw new Error(`filing ${i}: trades must be an array`);
    const trades: ParsedTrade[] = [];
    for (const raw of e.trades) {
      const t = (raw ?? {}) as Record<string, unknown>;
      const txDate = day(t.txDate);
      const txType = TYPES.find((x) => x === t.txType);
      if (!txDate || !txType || typeof t.asset !== 'string' || !t.asset.trim()) continue;
      trades.push({
        owner: OWNERS.find((x) => x === t.owner) ?? 'self',
        asset: t.asset.trim().slice(0, 300),
        ticker: typeof t.ticker === 'string' && /^[A-Z][A-Z0-9.\-]{0,15}$/.test(t.ticker) ? t.ticker : null,
        assetType: typeof t.assetType === 'string' && /^[A-Z]{2}$/.test(t.assetType) ? t.assetType : null,
        txType,
        txDate,
        notifiedDate: day(t.notifiedDate),
        amountLow: money(t.amountLow),
        amountHigh: money(t.amountHigh),
      });
    }
    return {
      chamber,
      filingId,
      filedDate: day(e.filedDate),
      sourceUrl,
      trades,
      personId: typeof e.personId === 'number' ? e.personId : undefined,
      bioguideId: typeof e.bioguideId === 'string' ? e.bioguideId.slice(0, 12) : undefined,
    };
  });
}
