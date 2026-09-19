'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/client/session';
import { useStockQuote, watchStockQuotes } from '@/lib/client/stockQuotes';
import { changeSince } from '@/lib/stocks';
import type { PinJson } from '@/lib/types';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayOnly = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// The company's own stock, inside the card's company pill (no symbol: the
// company is named just before it): its price now
// (Nasdaq, delayed) and its move since the close on the pin's start date,
// once that day has closed. Related and supplier tickers are on the pin page
// only. The quote is followed over the page's live stream only while the card
// is near the screen, like its market odds. `onDark` for the pill over the
// card's picture, which is dark in either theme.
export function CompanyTicker({ pin, onDark = false }: { pin: Pick<PinJson, 'id' | 'stocks'>; onDark?: boolean }) {
  // A signed-in viewer can turn these off (profile preferences).
  const hidden = useSession().user?.showCardStockPrices === false;
  const stock = hidden ? undefined : pin.stocks?.find((s) => s.relation === 'company');
  const ref = useRef<HTMLSpanElement>(null);
  const { id } = pin;
  const has = !!stock;

  useEffect(() => {
    const el = ref.current;
    if (!has || !el) return;
    let stop: (() => void) | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          stop ??= watchStockQuotes(id);
        } else {
          stop?.();
          stop = null;
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      stop?.();
    };
  }, [id, has]);

  const quote = useStockQuote(stock?.symbol ?? '');
  if (!stock) return null;
  const since = quote && stock.startPrice ? changeSince(stock.startPrice, quote.price) : null;
  const pct = since == null ? null : since * 100;
  const startDay = stock.startDay ? dayOnly.format(new Date(`${stock.startDay}T00:00:00Z`)) : null;
  const title =
    stock.startPrice != null && startDay
      ? `${stock.symbol}${pct == null ? '' : ` ${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`} since the ${startDay} close of ${usd.format(stock.startPrice)}`
      : startDay
        ? `${stock.symbol}: the ${startDay} close is not in yet`
        : stock.symbol;
  const up = onDark ? 'text-emerald-300' : 'text-success';
  const down = onDark ? 'text-red-300' : 'text-danger';
  return (
    <span ref={ref} className="inline-flex items-center gap-1 tabular-nums" title={title}>
      <span className={onDark ? 'text-white/40' : 'text-faint'} aria-hidden>
        ·
      </span>
      <span>{quote ? usd.format(quote.price) : '…'}</span>
      {pct != null ? (
        <span className={pct > 0 ? up : pct < 0 ? down : ''}>
          {pct > 0 ? '+' : ''}
          {pct.toFixed(2)}%
        </span>
      ) : null}
    </span>
  );
}
