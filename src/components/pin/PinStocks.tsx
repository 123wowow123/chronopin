'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { refreshStockQuotes, useStockQuote, watchStockQuotes } from '@/lib/client/stockQuotes';
import { changeSince, closeKnown, type PinStock, type StockPrice, type StockRelation } from '@/lib/stocks';

const GROUPS: { relation: StockRelation; heading: string }[] = [
  { relation: 'company', heading: 'Company' },
  { relation: 'related', heading: 'Related companies' },
  { relation: 'supplier', heading: 'Suppliers' },
];

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Closes and start days are market days: shown as the day they are, in New York.
const marketDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
const updated = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dayOnly = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Why a start date has no close: its market day has not closed yet, or it is
// older than Nasdaq's history (10 years) or before the listing.
function missingClose(day: string): string {
  const date = dayOnly.format(new Date(`${day}T00:00:00Z`));
  return closeKnown(day) ? `No close on record for ${date}` : `Close on ${date}, once the market has closed`;
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
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="w-40 shrink-0 text-subtle">{label}</span>
      {price ? (
        <>
          <span className="font-medium tabular-nums">{usd.format(price.price)}</span>
          <span className="text-xs text-subtle">({marketDay.format(new Date(price.at))})</span>
          <Change from={price.price} to={live} suffix="since" />
        </>
      ) : (
        <span className="text-subtle">{pending ?? 'No price on record'}</span>
      )}
    </div>
  );
}

function Ticker({ stock, canEdit, onRemove }: { stock: PinStock; canEdit: boolean; onRemove: () => void }) {
  const quote = useStockQuote(stock.symbol);
  const live = quote?.price ?? null;
  const [current, ...earlier] = stock.starts;
  return (
    <div className="surface px-4 py-3 text-sm">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <a
          href={`https://www.nasdaq.com/market-activity/${stock.assetClass === 'etf' ? 'etf' : 'stocks'}/${stock.symbol.toLowerCase()}`}
          target="_blank"
          rel="noopener nofollow"
          className="font-semibold tracking-wide text-ink hover:text-link hover:no-underline"
        >
          {stock.symbol}
        </a>
        {stock.name ? <span className="min-w-0 truncate text-subtle">{stock.name}</span> : null}
        {stock.note ? <span className="w-full text-xs text-subtle order-last">{stock.note}</span> : null}
        <span className="ml-auto flex items-baseline gap-2">
          {quote ? (
            <>
              <span className="text-base font-semibold tabular-nums">{usd.format(quote.price)}</span>
              {quote.changePercent != null ? <Change from={100} to={100 + quote.changePercent} suffix="today" /> : null}
            </>
          ) : (
            <span className="text-subtle">Loading price…</span>
          )}
          {canEdit ? (
            <button type="button" onClick={onRemove} className="self-center rounded p-0.5 text-subtle hover:bg-raised hover:text-ink" title={`Take ${stock.symbol} off this pin`}>
              <Icon name="close" className="size-3.5" />
            </button>
          ) : null}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <Snapshot label="When posted" price={stock.posted} live={live} />
        {current ? (
          <Snapshot
            label={`On start date${current.current ? '' : ' (earlier)'}`}
            price={current.price}
            pending={missingClose(current.day)}
            live={live}
          />
        ) : null}
        {earlier.map((start) => (
          <Snapshot
            key={start.utcStartDateTime}
            label={`Earlier start, ${dayOnly.format(new Date(`${start.day}T00:00:00Z`))}`}
            price={start.price}
            pending={missingClose(start.day)}
            live={live}
          />
        ))}
      </div>
      {quote ? (
        <p className="mt-2 text-xs text-subtle">
          Nasdaq, delayed{quote.marketStatus ? ` · market ${quote.marketStatus.toLowerCase()}` : ''} · updated {updated.format(new Date(quote.fetchedAt))}
        </p>
      ) : null}
    </div>
  );
}

// The stocks a pin moves or is about: each ticker's live (delayed) price, the
// price when the pin was posted and the close on its start date, with the
// start dates it had before. The pin's author and admins can take tickers
// off. Fetched in the browser: the page itself is cached for hours.
export function PinStocks({ pinId, authorId }: { pinId: number; authorId?: number }) {
  const { user, isAdmin } = useSession();
  const canEdit = !!user && (isAdmin || (authorId != null && Number(user.id) === Number(authorId)));
  const [stocks, setStocks] = useState<PinStock[] | null>(null);

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

  // Takes a ticker off (the pin's author or an admin). Tickers only come in
  // on their own: the pin's company, and what its scraped article names.
  const remove = async (symbol: string) => {
    try {
      const { stocks: next } = await api.put<{ stocks: PinStock[] }>(`/api/pins/${pinId}/stocks`, { remove: symbol });
      setStocks(next);
      refreshStockQuotes();
    } catch {
      // Left as it was; the × can be pressed again.
    }
  };

  if (!stocks?.length) return null;
  return (
    <section aria-labelledby="stocks-heading" className="mb-4 flex flex-col gap-3">
      <h2 id="stocks-heading" className="sr-only">
        Stocks
      </h2>
      {GROUPS.map(({ relation: group, heading }) => {
        const shown = stocks.filter((stock) => stock.relation === group);
        return shown.length ? (
          <div key={group} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wider text-subtle uppercase">{heading}</h3>
            {shown.map((stock) => (
              <Ticker key={stock.symbol} stock={stock} canEdit={canEdit} onRemove={() => void remove(stock.symbol)} />
            ))}
          </div>
        ) : null;
      })}
    </section>
  );
}
