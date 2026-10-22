// Stock trades disclosed under the STOCK Act: reading a House periodic
// transaction report (the text pdftotext -layout gives) and describing a
// trade. Pure, so the importer, the page and the tests share it.

export type TradeOwner = 'self' | 'spouse' | 'joint' | 'dependent';
export type TradeType = 'purchase' | 'sale' | 'partial' | 'exchange';

export type ParsedTrade = {
  owner: TradeOwner;
  asset: string;
  ticker: string | null;
  assetType: string | null;
  txType: TradeType;
  txDate: string; // YYYY-MM-DD
  notifiedDate: string | null;
  amountLow: number | null;
  amountHigh: number | null;
};

export const OWNERS: Record<string, TradeOwner> = { SP: 'spouse', DC: 'dependent', JT: 'joint' };
const TYPES: Record<string, TradeType> = { P: 'purchase', S: 'sale', 'S (partial)': 'partial', E: 'exchange' };

const isoDate = (us: string) => {
  const [m, d, y] = us.split('/');
  return `${y}-${m}-${d}`;
};
const dollars = (s: string) => Number(s.replace(/[$,]/g, ''));

// "$1,001 - $15,000" -> [1001, 15000]; "Over $50,000,000" -> [50000000, null].
export function parseAmount(text: string): { low: number | null; high: number | null } {
  const over = /over\s+\$([\d,]+)/i.exec(text);
  if (over) return { low: dollars(over[1]), high: null };
  const m = /\$([\d,]+)(?:\s*-\s*\$?([\d,]+))?/.exec(text);
  if (!m) return { low: null, high: null };
  return { low: dollars(m[1]), high: m[2] ? dollars(m[2]) : null };
}

// A transaction cannot come after its own notification, so a later date is a
// year typo on the form (Steve Cohen's 12/26/2026, notified 01/21/2026): read it
// as the previous year when that fits, else keep it as filed.
export function fixYearTypo(tx: string, notified: string): string {
  if (tx <= notified) return tx;
  const prev = `${Number(tx.slice(0, 4)) - 1}${tx.slice(4)}`;
  return prev <= notified ? prev : tx;
}

// A line holding the type, both dates and (the start of) the amount.
const ROW = /^(.*?)\s+(P|S \(partial\)|S|E)\s+(\d\d\/\d\d\/\d{4})\s+(\d\d\/\d\d\/\d{4})\s+(\$[\d,]+(?:\s*-\s*(?:\$[\d,]+)?)?|Over\s+\$[\d,]+)/;
// The filing-status / subholding / description lines that follow each row.
const META = /^\s*(F\s+S\s*:|S\s+O\s*:|D\s+:|L\s*:|C\s*:|ID\s+Owner\s+Asset|Type\s+Date|\*|Filing ID #|Clerk of the House|T\s*$|Cap\.)/;

// The column header every page repeats.
const PAGE_HEADER = /^\s*(ID\s+Owner\s+Asset|Type\s+Date|Gains\s*>|\$200\?|\f)/;

export function parsePtrText(text: string): ParsedTrade[] {
  const lines = text.split(/\r?\n/);
  const rows: (ParsedTrade & { done: boolean })[] = [];
  let current: (ParsedTrade & { done: boolean }) | null = null;
  // A range split across a page break: the row's "$15,001 -" is the last line of
  // one page and its "$50,000" opens the next, under the repeated column header.
  let awaitHigh = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = ROW.exec(line);
    if (m) {
      let prefix = m[1].trim();
      let owner: TradeOwner = 'self';
      const own = /^(SP|DC|JT)\s+(.*)$/.exec(prefix);
      if (own) {
        owner = OWNERS[own[1]];
        prefix = own[2];
      }
      let amountText = m[5];
      // An amount can wrap: "$15,001 -" then "$50,000" on the next line.
      if (/-\s*$/.test(amountText)) {
        // ...on the next line, alone or after the asset's "[OL]" type tag.
        const next = /^\s*(\$[\d,]+)/.exec(lines[i + 1] ?? '') ?? /\s{2,}(\$[\d,]+)\s*$/.exec(lines[i + 1] ?? '');
        if (next) amountText += ` ${next[1]}`;
      }
      const { low, high } = parseAmount(amountText);
      current = {
        owner,
        asset: prefix,
        ticker: null,
        assetType: null,
        txType: TYPES[m[2]],
        txDate: fixYearTypo(isoDate(m[3]), isoDate(m[4])),
        notifiedDate: isoDate(m[4]),
        amountLow: low,
        amountHigh: high,
        done: false,
      };
      awaitHigh = /-\s*$/.test(amountText) && high == null;
      rows.push(current);
      continue;
    }
    if (awaitHigh && current) {
      if (PAGE_HEADER.test(line) || /^\s*$/.test(line)) continue;
      const rest = /\s(\$[\d,]+)\s*$/.exec(line);
      if (rest) {
        current.amountHigh = dollars(rest[1]);
        awaitHigh = false;
        current.done = false;
        current.asset = `${current.asset} ${line.replace(/\s+\$[\d,]+\s*$/, '').trim()}`.trim();
        continue;
      }
      awaitHigh = false;
    }
    if (!current || current.done) continue;
    if (META.test(line) || /^\s*$/.test(line)) {
      // Blank lines inside the asset name are rare; the first blank or
      // metadata line ends the name.
      if (META.test(line) || current.asset) current.done = true;
      continue;
    }
    if (/^\s*\$[\d,]+\s*$/.test(line)) continue; // the wrapped amount
    current.asset = `${current.asset} ${line.replace(/\s{2,}\$[\d,]+\s*$/, '').trim()}`; // minus a wrapped amount
  }
  return rows.map(({ done: _done, ...t }) => {
    const ticker = /\(([A-Z][A-Z0-9.\-]{0,9})\)/.exec(t.asset) ?? /(?:NYSEARCA|NASDAQ|NYSE|BATS|NYSEAMERICAN):\s*([A-Z][A-Z0-9.\-]{0,9})\s*$/.exec(t.asset);
    const kind = /\[([A-Z]{2})\]/.exec(t.asset);
    const asset = t.asset.replace(/\s*ID Owner Asset.*$/, '').replace(/\s*\[[A-Z]{2}\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return { ...t, asset, ticker: ticker ? ticker[1] : null, assetType: kind ? kind[1] : null };
  });
}

// "$1,001 - $15,000" for display; a midpoint is never shown as a figure.
export function formatAmountRange(low: number | null, high: number | null): string {
  const f = (n: number) => `$${n.toLocaleString('en-US')}`;
  if (low == null) return '';
  return high == null ? `Over ${f(low)}` : `${f(low)} – ${f(high)}`;
}

export type TradeRow = {
  id: number;
  chamber: 'house' | 'senate' | 'executive';
  filingId: string;
  owner: TradeOwner;
  asset: string;
  ticker: string | null;
  assetType: string | null;
  txType: TradeType;
  txDate: string;
  notifiedDate: string | null;
  filedDate: string | null;
  amountLow: number | null;
  amountHigh: number | null;
  sourceUrl: string;
  // Committee seats the member holds that oversee this company's sector: a possible conflict of interest.
  conflicts?: { committee: string; sector: string }[];
};

export type TradeSummary = {
  count: number;
  purchases: number;
  sales: number;
  // Sum of the range ends: a floor and a ceiling, never one estimate.
  volumeLow: number;
  volumeHigh: number;
  tickers: { ticker: string; count: number }[];
  first: string | null;
  last: string | null;
};

export function summarizeTrades(trades: TradeRow[]): TradeSummary {
  const tickers = new Map<string, number>();
  let purchases = 0;
  let sales = 0;
  let volumeLow = 0;
  let volumeHigh = 0;
  for (const t of trades) {
    if (t.txType === 'purchase') purchases++;
    else if (t.txType === 'sale' || t.txType === 'partial') sales++;
    volumeLow += t.amountLow ?? 0;
    volumeHigh += t.amountHigh ?? t.amountLow ?? 0;
    if (t.ticker) tickers.set(t.ticker, (tickers.get(t.ticker) ?? 0) + 1);
  }
  const dates = trades.map((t) => t.txDate).sort();
  return {
    count: trades.length,
    purchases,
    sales,
    volumeLow,
    volumeHigh,
    tickers: [...tickers].map(([ticker, count]) => ({ ticker, count })).sort((a, b) => b.count - a.count || a.ticker.localeCompare(b.ticker)).slice(0, 8),
    first: dates[0] ?? null,
    last: dates[dates.length - 1] ?? null,
  };
}
