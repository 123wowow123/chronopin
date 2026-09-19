// Stock tickers on pins: which price a snapshot takes, US market days, and
// reading Nasdaq's public quote API (api.nasdaq.com, keyless, US listings,
// quotes delayed ~15 minutes). Pure: the server fetches (src/server/stocks.ts).

export type AssetClass = 'stocks' | 'etf';

export type StockPrice = { price: number; at: string };

export type StockRelation = 'company' | 'related' | 'supplier';
export const STOCK_RELATIONS: StockRelation[] = ['company', 'related', 'supplier'];
// company: from the pin's company (its ticker and relations); article: named
// by the scraped article; manual: added on the pin page.
export type StockOrigin = 'company' | 'article' | 'manual';

// A ticker as a scrape finds it and a pin's POST/PUT body carries it.
export type ScrapedStock = { symbol: string; name: string | null; relation: StockRelation; note: string | null };

// A body's stocks, cleaned: known relations, real-looking symbols, no repeats,
// at most MAX_PIN_TICKERS. Anything else is dropped rather than refused, so a
// bad entry never costs the pin.
export function parseScrapedStocks(raw: unknown): ScrapedStock[] {
  if (!Array.isArray(raw)) return [];
  const out: ScrapedStock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const symbol = normalizeSymbol(r.symbol);
    const relation = STOCK_RELATIONS.includes(r.relation as StockRelation) ? (r.relation as StockRelation) : 'related';
    if (!symbol || out.some((s) => s.symbol === symbol)) continue;
    const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
    out.push({ symbol, name: text(r.name, 255), relation, note: text(r.note, 300) });
    if (out.length === MAX_PIN_TICKERS) break;
  }
  return out;
}

// A pin's ticker as the pin page shows it.
export type PinStock = {
  symbol: string;
  name: string | null;
  assetClass: AssetClass;
  origin: StockOrigin;
  // The pin's company itself, a related company, or a supplier; why, for the latter two.
  relation: StockRelation;
  note: string | null;
  posted: StockPrice | null;
  // Newest start date first; the first is the pin's current start.
  starts: { utcStartDateTime: string; day: string; price: StockPrice | null; current: boolean }[];
};

// What the live feed pushes for a symbol.
export type StockQuote = {
  symbol: string;
  price: number;
  change: number | null;
  changePercent: number | null;
  marketStatus: string | null;
  // The last trade's time as Nasdaq words it ("Sep 17, 2026"). Not reliable:
  // seen a day behind its own history, so shown nowhere.
  asOf: string | null;
  fetchedAt: string;
};

// The company, three related and three suppliers, and one more by hand.
export const MAX_PIN_TICKERS = 8;

const SYMBOL = /^[A-Z][A-Z0-9.-]{0,9}$/;

export function normalizeSymbol(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const symbol = raw.trim().replace(/^\$/, '').toUpperCase();
  return SYMBOL.test(symbol) ? symbol : null;
}

/* US market time */

const MARKET_ZONE = 'America/New_York';
const CLOSE_HOUR = 16;

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: MARKET_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

// The New York calendar day of an instant ("YYYY-MM-DD").
export const marketDayOf = (instant: Date) => dayFormat.format(instant);

// Minutes New York is behind UTC at an instant (240 in summer, 300 in winter).
function zoneLag(instant: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: MARKET_ZONE, timeZoneName: 'shortOffset' }).formatToParts(instant).find((p) => p.type === 'timeZoneName')!.value;
  const [, sign, h, m] = /GMT([+-])(\d+)(?::(\d+))?/.exec(name) ?? [, '-', '5', '0'];
  return (sign === '-' ? 1 : -1) * (Number(h) * 60 + Number(m ?? 0));
}

// A New York wall-clock time as an instant.
export function marketTime(day: string, hour: number, minute = 0): Date {
  const guess = new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  const first = new Date(+guess + zoneLag(guess) * 60_000);
  // Across a clock change the lag at the answer can differ from the guess's.
  return new Date(+guess + zoneLag(first) * 60_000);
}

export const closeOf = (day: string) => marketTime(day, CLOSE_HOUR);

// Nasdaq's daily history lands a little after the bell.
export const SETTLE_MS = 30 * 60_000;

// The market day a pin's start stands for: an all-day pin's own (UTC) day, a
// timed pin's day in New York.
export function startMarketDay(utcStartDateTime: string | Date, allDay: boolean): string {
  const start = new Date(utcStartDateTime);
  return allDay ? start.toISOString().slice(0, 10) : marketDayOf(start);
}

// Whether a day's close can be read yet (the day has closed and settled).
export const closeKnown = (day: string, now: Date = new Date()) => +now >= +closeOf(day) + SETTLE_MS;

/* Choosing a price */

export type DailyClose = { day: string; close: number };

// The close of `day`, or of the last trading day before it (a weekend or a
// holiday). `closes` may be in any order. Null when none is on or before it.
export function closeOnOrBefore(closes: DailyClose[], day: string): (DailyClose & { at: string }) | null {
  let best: DailyClose | null = null;
  for (const c of closes) if (c.day <= day && (!best || c.day > best.day)) best = c;
  return best ? { ...best, at: closeOf(best.day).toISOString() } : null;
}

// The last price known at an instant, from a day's intraday points (instants)
// or else the closes before it.
export function priceAt(instant: Date, closes: DailyClose[], intraday: { at: Date; price: number }[] = []): StockPrice | null {
  let point: { at: Date; price: number } | null = null;
  for (const p of intraday) if (+p.at <= +instant && (!point || +p.at > +point.at)) point = p;
  const closed = closes.filter((c) => +closeOf(c.day) <= +instant);
  const close = closeOnOrBefore(closed, marketDayOf(instant));
  if (point && (!close || +point.at > +new Date(close.at))) return { price: point.price, at: point.at.toISOString() };
  return close ? { price: close.close, at: close.at } : null;
}

// How far the price has moved from a snapshot, as a fraction.
export const changeSince = (from: number, to: number) => (from ? (to - from) / from : null);

/* Nasdaq */

// "$1,493.78" -> 1493.78; "N/A", "" -> null.
export function nasdaqNumber(text: unknown): number | null {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  if (typeof text !== 'string') return null;
  const n = Number(text.replace(/[$,%\s]/g, ''));
  return text.trim() && Number.isFinite(n) ? n : null;
}

// "09/18/2026" -> "2026-09-18".
export function nasdaqDay(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

// A chart point's x is New York wall-clock time written as if it were UTC.
export function nasdaqChartInstant(x: number): Date {
  const wall = new Date(x);
  return marketTime(wall.toISOString().slice(0, 10), wall.getUTCHours(), wall.getUTCMinutes());
}

// Whether a symbol search hit is the company itself: a stock whose listed
// name is the company's name, then only its legal suffix and share class
// ("Sony" -> "Sony Group Corporation American Depositary Shares" passes;
// "OpenAI" -> "OpenAI Lab Ecosystem ETF" does not, it is an ETF).
export function isCompanyListing(company: string, hit: { name: string; asset: string }): boolean {
  if (hit.asset?.toUpperCase() !== 'STOCKS') return false;
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const want = words(company);
  const name = words(hit.name);
  if (!want || !name.startsWith(want) || (name.length > want.length && name[want.length] !== ' ')) return false;
  // What may follow: a group/holding word, a legal suffix, a share class, or
  // one of the few descriptive words big listings carry (Dell Technologies,
  // Meta Platforms, Toyota Motor). Not ordinary words another company's name
  // can hold: "Brightline" (the rail line, private) must not match Brightline
  // Interactive.
  const rest = name.slice(want.length).trim().split(' ').filter(Boolean);
  const allowed = /^(group|holdings?|co|company|corp|corporation|inc|incorporated|ltd|limited|plc|sa|ag|nv|se|the|class|[a-c]|common|ordinary|stock|shares?|american|depositary|depository|receipts?|ads|adr|each|representing|one|new|motor|platforms|technologies|l|p|lp)$/;
  return rest.every((w) => allowed.test(w));
}

/* Tidbits */

// A listing's name as people say it: "Apple Inc. Common Stock" -> "Apple",
// "Sony Group Corporation American Depositary Shares" -> "Sony",
// "Advanced Micro Devices, Inc." -> "Advanced Micro Devices" (a hand-set name,
// such as "AMD" or "TSMC", is kept as given).
export function shortCompanyName(name: string | null | undefined): string {
  let short = (name ?? '').trim();
  const tail =
    /[,\s]+(common stock|class [a-c]( common stock| ordinary shares)?|ordinary shares|american depositary shares|american depository shares|ads|adr|group|holdings?|incorporated|inc\.?|corporation|corp\.?|company|co\.?|limited|ltd\.?|plc|s\.?a\.?|n\.?v\.?|ag|se)$/i;
  for (let prev = ''; prev !== short; ) {
    prev = short;
    short = short.replace(tail, '').trim();
  }
  return short || (name ?? '').trim();
}

const RELATION_LABEL: Record<StockRelation, string> = { company: 'Company', related: 'Related', supplier: 'Supplier' };

// One line on why a ticker is on a pin: "Related: Apple (AAPL), the biggest
// customer for Sony's camera image sensors." The note is the clause that
// follows the name, used as written (the prompts ask for it in that form);
// the symbol is left out when the name is the symbol.
export function stockTidbit(stock: { symbol: string; name: string | null; relation: StockRelation; note: string | null }): string {
  const name = shortCompanyName(stock.name) || stock.symbol;
  const who = name === stock.symbol ? name : `${name} (${stock.symbol})`;
  const note = stock.note?.trim().replace(/[.\s]+$/, '');
  return `${RELATION_LABEL[stock.relation]}: ${who}${note ? `, ${note}` : ''}.`;
}
