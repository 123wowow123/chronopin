'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useStockQuote, watchStockQuotes } from '@/lib/client/stockQuotes';
import { changeSince, closeKnown, stockTidbit, type PinStock, type StockPrice, type StockRelation } from '@/lib/stocks';
import { useLocale, useT } from '@/lib/client/i18n';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/config';
import { stockFormats } from '@/lib/i18n/numbers';
import type { MessageKey, Translator } from '@/lib/i18n/translate';

const GROUPS: { relation: StockRelation; heading: MessageKey }[] = [
  { relation: 'company', heading: 'stocks.company' },
  { relation: 'related', heading: 'stocks.related' },
  { relation: 'supplier', heading: 'stocks.suppliers' },
];

// Closes and start days are market days: shown as the day they are, in New York.
const marketDay = (locale: Locale) => dateFormat(INTL_LOCALES[locale], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
const marketDayShort = (locale: Locale) => dateFormat(INTL_LOCALES[locale], { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
// This year's days go without the year, so a row fits a phone.
const priceDay = (at: string, locale: Locale) => {
  const d = new Date(at);
  return d.getUTCFullYear() === new Date().getUTCFullYear() ? marketDayShort(locale).format(d) : marketDay(locale).format(d);
};

// Why a start date has no close: its market day has not closed yet, or it is
// older than Nasdaq's history (10 years) or before the listing.
function missingClose(day: string, t: Translator): string {
  const date = stockFormats(t.locale).dayOnly.format(new Date(`${day}T00:00:00Z`));
  return closeKnown(day) ? t('stocks.noClose', { date }) : t('stocks.closeOnce', { date });
}

function Change({ from, to, suffix }: { from: number; to: number | null | undefined; suffix?: string }) {
  const change = to == null ? null : changeSince(from, to);
  if (change == null) return null;
  const pct = change * 100;
  return (
    <span className={`tabular-nums ${pct > 0 ? 'text-success' : pct < 0 ? 'text-danger' : 'text-subtle'}`}>
      {pct > 0 ? '+' : ''}
      {pct.toFixed(2)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

function Snapshot({ label, price, pending, live }: { label: React.ReactNode; price: StockPrice | null; pending?: string; live: number | null }) {
  const t = useT();
  const { usd } = stockFormats(t.locale);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="w-24 shrink-0 text-subtle sm:w-36">{label}</span>
      {price ? (
        <>
          <span className="font-medium tabular-nums">{usd.format(price.price)}</span>
          <span className="text-xs text-subtle">({priceDay(price.at, t.locale)})</span>
          <Change from={price.price} to={live} suffix={t('stocks.since')} />
        </>
      ) : (
        <span className="text-subtle">{pending ?? t('stocks.noPrice')}</span>
      )}
    </div>
  );
}

// One ticker as a pill: symbol, live price and today's move. Pressed, its
// details open under the pills (one at a time).
function TickerPill({ stock, open, onToggle }: { stock: PinStock; open: boolean; onToggle: () => void }) {
  const quote = useStockQuote(stock.symbol);
  const { usd } = stockFormats(useLocale());
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="stock-details"
      onClick={onToggle}
      title={[stock.name, stock.note].filter(Boolean).join(' - ')}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 transition-colors ring-inset ${
        open ? 'bg-raised ring-link' : 'bg-panel ring-line hover:bg-raised'
      }`}
    >
      <span className="font-semibold tracking-wide text-ink">{stock.symbol}</span>
      {quote ? (
        <>
          <span className="tabular-nums text-ink/90">{usd.format(quote.price)}</span>
          {quote.changePercent != null ? (
            <span className="text-xs">
              <Change from={100} to={100 + quote.changePercent} />
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-xs text-subtle">…</span>
      )}
    </button>
  );
}

// The open pill's details: a line on why it is on the pin ("Supplier: AMD,
// which designs the PlayStation 5 processor."), and its price when posted and
// on each start date against the live one.
function TickerDetails({ stock }: { stock: PinStock }) {
  const quote = useStockQuote(stock.symbol);
  const t = useT();
  const live = quote?.price ?? null;
  const [current, ...earlier] = stock.starts;
  return (
    <div id="stock-details" className="surface flex flex-col gap-1 px-4 py-3 text-sm">
      <p className="mb-1 text-ink/90">{stockTidbit(stock, t)}</p>
      <Snapshot label={t('stocks.posted')} price={stock.posted} live={live} />
      {current ? (
        <Snapshot label={current.current ? t('stocks.startDate') : t('stocks.startDateEarlier')} price={current.price} pending={missingClose(current.day, t)} live={live} />
      ) : null}
      {earlier.map((start) => (
        <Snapshot
          key={start.utcStartDateTime}
          label={t('stocks.earlierStart', { date: stockFormats(t.locale).dayOnly.format(new Date(`${start.day}T00:00:00Z`)) })}
          price={start.price}
          pending={missingClose(start.day, t)}
          live={live}
        />
      ))}
      <div className="mt-1 flex items-center gap-3 text-xs">
        <a
          href={`https://finance.yahoo.com/quote/${encodeURIComponent(stock.symbol.replace('.', '-'))}/`}
          target="_blank"
          rel="noopener nofollow"
          className="inline-flex items-center gap-1 text-subtle hover:text-link hover:no-underline"
        >
          {t('stocks.onYahoo', { symbol: stock.symbol })}
          <Icon name="external" className="size-3" />
        </a>
      </div>
    </div>
  );
}

// When the prices were read, once for all of them: they share a feed.
function QuoteNote({ symbol }: { symbol: string }) {
  const quote = useStockQuote(symbol);
  const t = useT();
  if (!quote) return null;
  const updated = dateFormat(INTL_LOCALES[t.locale], { hour: 'numeric', minute: '2-digit' });
  return (
    <p className="text-xs text-subtle">
      {t('stocks.nasdaqDelayed')}
      {quote.marketStatus ? ` · ${t('stocks.market', { status: quote.marketStatus.toLowerCase() })}` : ''} · {t('stocks.updated', { time: updated.format(new Date(quote.fetchedAt)) })}
    </p>
  );
}

// The stocks a pin moves or is about: each ticker's live (delayed) price, the
// price when the pin was posted and the close on its start date, with the
// start dates it had before. Tickers come in on their own (the company, its
// relations, the scraped article); there is nothing to add or remove here. Fetched in the browser: the page itself is cached for hours.
export function PinStocks({ pinId }: { pinId: number }) {
  const [stocks, setStocks] = useState<PinStock[] | null>(null);
  const [openSymbol, setOpenSymbol] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    let live = true;
    api
      .get<{ stocks: PinStock[] }>(`/api/pins/${pinId}/stocks`)
      .then(({ stocks: loaded }) => live && setStocks(loaded))
      .catch(() => live && setStocks([]));
    return () => {
      live = false;
    };
  }, [pinId]);

  const hasStocks = !!stocks?.length;
  useEffect(() => (hasStocks ? watchStockQuotes(pinId) : undefined), [pinId, hasStocks]);


  if (!stocks?.length) return null;
  const opened = stocks.find((stock) => stock.symbol === openSymbol);
  return (
    <section aria-labelledby="stocks-heading" className="mb-4 flex flex-col gap-2">
      <h2 id="stocks-heading" className="sr-only">
        {t('stocks.heading')}
      </h2>
      {GROUPS.map(({ relation: group, heading }) => {
        const shown = stocks.filter((stock) => stock.relation === group);
        return shown.length ? (
          <div key={group} className="flex flex-wrap items-center gap-1.5">
            {/* Beside the pills, on a phone as well: one ticker and its label
                sit on a line together, and a row of them wraps under it. */}
            <h3 className="mr-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">{t(heading)}</h3>
            {shown.map((stock) => (
              <TickerPill key={stock.symbol} stock={stock} open={stock.symbol === openSymbol} onToggle={() => setOpenSymbol((o) => (o === stock.symbol ? null : stock.symbol))} />
            ))}
          </div>
        ) : null;
      })}
      {opened ? <TickerDetails stock={opened} /> : null}
      <QuoteNote symbol={stocks[0].symbol} />
    </section>
  );
}
