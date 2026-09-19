// Stock tickers on pins, kept up after every save (events.ts) and on read:
//
//   1. the pin's company gets its US ticker looked up once (Company.tickerSymbol)
//      and its related and supplier companies' tickers found once (Claude,
//      CompanyRelation); every pin of the company carries them (origin 'company')
//   2. every ticker has a 'posted' snapshot and a 'start' snapshot for the
//      pin's current start; a moved start adds a row, the old ones stay
//   3. empty snapshots are priced: posted = the last close or intraday price
//      at the moment the pin was posted, start = the close on the start's market day once it closed

import { closeKnown, closeOnOrBefore, MAX_PIN_TICKERS, priceAt, startMarketDay, type AssetClass, type PinStock, type ScrapedStock, type StockPrice } from '@/lib/stocks';
import * as db from '../db';
import { findCompanyRelations, RelationsUnavailable } from '../extract/companyRelations';
import CompanyRelation, { type CompanyRelationRow } from '../model/companyRelation';
import PinTicker, { type PriceRow } from '../model/pinTicker';
import { fetchCloses, fetchIntraday, fetchQuote, identify, lookupCompanyTicker } from '../stocks';
import log from '../util/log';

// A snapshot Nasdaq had no price for is asked about again after this.
const RECHECK_MS = 24 * 3_600_000;

type PinFacts = {
  id: number;
  utcCreatedDateTime: Date;
  utcStartDateTime: Date;
  allDay: boolean;
  companyId: number | null;
  company: string | null;
  tickerSymbol: string | null;
  utcTickerCheckedDateTime: Date | null;
  companyWikiUrl: string | null;
  utcRelationsCheckedDateTime: Date | null;
  companyTickerNote: string | null;
};

async function pinFacts(pinId: number): Promise<PinFacts | null> {
  const [pin] = await db.query<PinFacts>(
    `SELECT "p"."id", "p"."utcCreatedDateTime", "p"."utcStartDateTime", "p"."allDay", "p"."companyId", "c"."name"::text AS "company",
            "c"."tickerSymbol", "c"."utcTickerCheckedDateTime", "c"."wikiUrl" AS "companyWikiUrl", "c"."utcRelationsCheckedDateTime",
            "c"."tickerNote" AS "companyTickerNote"
     FROM "Pin" AS "p" LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
     WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  return pin ?? null;
}

// The company's ticker, looked up the first time it is needed.
async function companyTicker(pin: PinFacts): Promise<string | null> {
  if (!pin.companyId || !pin.company) return null;
  if (pin.utcTickerCheckedDateTime) return pin.tickerSymbol;
  const found = await lookupCompanyTicker(pin.company);
  // Fills an empty one only: a ticker an article gave the company meanwhile
  // (adoptCompanyStock, run alongside on a new pin) is not cleared by a
  // lookup that found none.
  const [row] = await db.query<{ tickerSymbol: string | null }>(
    `UPDATE "Company" SET "tickerSymbol" = COALESCE("tickerSymbol", $2), "utcTickerCheckedDateTime" = now() WHERE "id" = $1 RETURNING "tickerSymbol"`,
    [pin.companyId, found?.symbol ?? null],
  );
  return row?.tickerSymbol ?? null;
}

async function priceSnapshot(row: PriceRow, ticker: { symbol: string; assetClass: AssetClass }, pin: PinFacts, now: Date): Promise<StockPrice | null> {
  if (row.kind === 'posted') {
    // The last close or intraday point at the moment, which says when it was
    // the price (a quote's own trade date is not reliable); the quote only
    // when neither reaches (a pin posted before today's first point).
    const posted = new Date(pin.utcCreatedDateTime);
    const [closes, points] = await Promise.all([fetchCloses(ticker.symbol, ticker.assetClass), fetchIntraday(ticker.symbol, ticker.assetClass).catch(() => [])]);
    const known = priceAt(posted, closes, points);
    if (known || +now - +posted > 3_600_000) return known;
    const quote = await fetchQuote(ticker.symbol, ticker.assetClass);
    return quote ? { price: quote.price, at: now.toISOString() } : null;
  }
  if (!closeKnown(row.day!, now)) return null;
  const close = closeOnOrBefore(await fetchCloses(ticker.symbol, ticker.assetClass), row.day!);
  return close ? { price: close.close, at: close.at } : null;
}

// Whether a snapshot still wants a price and may be asked about now.
// The company's related and supplier tickers, asked of Claude the first time
// and kept only if Nasdaq knows the symbol. With Claude out of reach (no key,
// no credit) the company is left to be asked next time; hand-set ones stand.
async function companyRelations(pin: PinFacts, ownSymbol: string | null): Promise<CompanyRelationRow[]> {
  if (!pin.companyId || !pin.company) return [];
  if (!pin.utcRelationsCheckedDateTime) {
    try {
      const found = await findCompanyRelations({ name: pin.company, ownSymbol, wikiUrl: pin.companyWikiUrl });
      // A line set by hand stands.
      if (found.about && !pin.companyTickerNote) {
        await db.query(`UPDATE "Company" SET "tickerNote" = $2 WHERE "id" = $1 AND "tickerNote" IS NULL`, [pin.companyId, found.about]);
        pin.companyTickerNote = found.about;
      }
      for (const r of found.relations) {
        const listing = await identify(r.symbol);
        if (listing) await CompanyRelation.set(pin.companyId, { ...r, name: r.name || listing.quote.name, assetClass: listing.assetClass, origin: 'claude' });
      }
      await CompanyRelation.markChecked(pin.companyId);
    } catch (err) {
      if (!(err instanceof RelationsUnavailable)) throw err;
      log.warn(`company relations for ${pin.company} not asked:`, err.message);
    }
  }
  return CompanyRelation.forCompany(pin.companyId);
}

const due = (row: PriceRow, now: Date) =>
  row.price == null && (row.kind === 'posted' || closeKnown(row.day!, now)) && (!row.utcCheckedDateTime || +now - +new Date(row.utcCheckedDateTime) > RECHECK_MS);

// Brings a pin's tickers and snapshots up to date. `lookup` false skips the
// company lookup (a read, which should not add tickers of its own accord).
export async function syncPinStocks(pinId: number, { lookup = true }: { lookup?: boolean } = {}): Promise<PinStock[]> {
  const pin = await pinFacts(pinId);
  if (!pin) return [];
  let lookupAdded = false;
  if (lookup) {
    try {
      const symbol = await companyTicker(pin);
      const all = await PinTicker.forPin(pinId, { withRemoved: true });
      const has = (s: string) => all.some((t) => t.symbol === s);
      if (symbol && !has(symbol)) {
        await PinTicker.add(pinId, { symbol, name: pin.company, assetClass: 'stocks', origin: 'company', relation: 'company', note: pin.companyTickerNote });
        lookupAdded = true;
      }
      // Relations first: asking Claude for them also writes the company's line.
      const relations = await companyRelations(pin, symbol);
      if (symbol && (await PinTicker.refreshFromCompany(pinId, { symbol, name: pin.company, relation: 'company', note: pin.companyTickerNote }))) {
        lookupAdded = true;
      }
      // A ticker taken off the pin (kept, marked removed) is not added back.
      for (const r of relations) {
        if (!has(r.symbol)) {
          await PinTicker.add(pinId, { symbol: r.symbol, name: r.name, assetClass: r.assetClass, origin: 'company', relation: r.relation, note: r.note });
          lookupAdded = true;
        } else if (await PinTicker.refreshFromCompany(pinId, r)) {
          lookupAdded = true;
        }
      }
    } catch (err) {
      log.warn(`company ticker lookup failed for pin ${pinId}:`, (err as Error).message);
    }
  }
  const tickers = await PinTicker.forPin(pinId);
  const start = { utcStartDateTime: new Date(pin.utcStartDateTime), day: startMarketDay(pin.utcStartDateTime, pin.allDay) };
  for (const t of tickers) await PinTicker.ensureSnapshots(t.id, start);

  const now = new Date();
  const pending = (await PinTicker.prices(tickers.map((t) => t.id))).filter((row) => due(row, now));
  const before = JSON.stringify(tickers.map((t) => t.symbol));
  for (const row of pending) {
    const ticker = tickers.find((t) => t.id === row.pinTickerId)!;
    try {
      await PinTicker.setPrice(row.id, await priceSnapshot(row, ticker, pin, now));
    } catch (err) {
      // Left unchecked: Nasdaq being down is no answer about the day.
      log.warn(`stock price ${ticker.symbol} for pin ${pinId} failed:`, (err as Error).message);
    }
  }
  const stocks = await PinTicker.stocksOf(pinId, pin.utcStartDateTime);
  // Cards read tickers and start closes from cached pages: a new ticker or a
  // price found shows there once the pin's caches are dropped.
  if (pending.length || JSON.stringify(stocks.map((s) => s.symbol)) !== before || lookupAdded) forgetCachedPin(pinId);
  return stocks;
}

// Outside a Next.js server (a script) there are no caches to drop.
function forgetCachedPin(pinId: number) {
  import('./cache').then(({ invalidatePin }) => invalidatePin(pinId)).catch(() => {});
}

// Tickers a pin was sent with (its scraped article's, or an API caller's):
// each checked on Nasdaq and added, then priced. Only adds: a symbol the pin
// has, or had and lost by hand, is left as it is, so a re-sent edit form never
// brings back a removed ticker or undoes a change made on the pin page.
export async function addPinStocks(pinId: number, stocks: ScrapedStock[]): Promise<void> {
  if (!stocks.length) return;
  const existing = await PinTicker.forPin(pinId, { withRemoved: true });
  let room = MAX_PIN_TICKERS - existing.filter((t) => !t.removed).length;
  for (const stock of stocks) {
    if (room <= 0) break;
    if (existing.some((t) => t.symbol === stock.symbol)) continue;
    const listing = await identify(stock.symbol);
    if (!listing) {
      log.warn(`pin ${pinId}: dropped ticker ${stock.symbol}, which Nasdaq does not list`);
      continue;
    }
    // The name the article or caller gave (the one people use) over Nasdaq's legal one.
    await PinTicker.add(pinId, { symbol: stock.symbol, name: stock.name || listing.quote.name, assetClass: listing.assetClass, origin: 'article', relation: stock.relation, note: stock.note });
    room--;
  }
  await adoptCompanyStock(pinId, stocks);
  await syncPinStocks(pinId, { lookup: false });
}

// What an article says of the pin's own company is kept on the company, for
// its other pins, where the company has nothing yet: its ticker (the name
// lookup can miss one, e.g. a name that is not the listing's) once Nasdaq
// knows it, and its line ("the Japanese electronics ... group behind
// PlayStation"). Never over what a lookup or a person already set.
async function adoptCompanyStock(pinId: number, stocks: ScrapedStock[]): Promise<void> {
  const own = stocks.find((s) => s.relation === 'company');
  if (!own) return;
  const [company] = await db.query<{ id: number; tickerSymbol: string | null; tickerNote: string | null }>(
    `SELECT "c"."id", "c"."tickerSymbol", "c"."tickerNote" FROM "Pin" AS "p" JOIN "Company" AS "c" ON "c"."id" = "p"."companyId" WHERE "p"."id" = $1`,
    [pinId],
  );
  if (!company) return;
  if (!company.tickerSymbol && (await identify(own.symbol))) {
    await db.query(`UPDATE "Company" SET "tickerSymbol" = $2, "utcTickerCheckedDateTime" = now() WHERE "id" = $1 AND "tickerSymbol" IS NULL`, [company.id, own.symbol]);
  }
  if (!company.tickerNote && own.note && (company.tickerSymbol ?? own.symbol) === own.symbol) {
    await db.query(`UPDATE "Company" SET "tickerNote" = $2 WHERE "id" = $1 AND "tickerNote" IS NULL`, [company.id, own.note]);
  }
}

// For after() in a route: a ticker failing must not fail the pin's save.
export async function addPinStocksQuietly(pinId: number, stocks: ScrapedStock[]): Promise<void> {
  try {
    await addPinStocks(pinId, stocks);
  } catch (err) {
    log.warn(`pin ${pinId}: adding its tickers failed:`, (err as Error).message);
  }
}
