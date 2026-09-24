'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/lib/client/session';
import { useStockQuote, watchStockQuotes } from '@/lib/client/stockQuotes';
import { changeSince } from '@/lib/stocks';
import type { PinJson } from '@/lib/types';
import { useT } from '@/lib/client/i18n';
import { stockFormats } from '@/lib/i18n/numbers';


// The company's own stock, inside the card's company pill (no symbol: the
// company is named just before it): its price now
// (Nasdaq, delayed) and its move since the close on the pin's start date,
// once that day has closed ("+1.02% since"). Related and supplier tickers are on the pin page
// only. The quote is followed over the page's live stream only while the card
// is near the screen, like its market odds. `onDark` for the pill over the
// card's picture, which is dark in either theme. `bare` drops the leading dot,
// for a row of its own (the pin page's thread), which shows the start
// close and the move since ("start was $200.99 +10.57%"), not the price now, which
// the page already shows.
export function CompanyTicker({ pin, onDark = false, bare = false }: { pin: Pick<PinJson, 'id' | 'stocks'>; onDark?: boolean; bare?: boolean }) {
  // A signed-in viewer can turn these off (profile preferences).
  const hidden = useSession().user?.showCardStockPrices === false;
  const t = useT();
  const { usd, dayOnly } = stockFormats(t.locale);
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
  const pctText = pct == null ? '' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
  const startDay = stock.startDay ? dayOnly.format(new Date(`${stock.startDay}T00:00:00Z`)) : null;
  const title =
    stock.startPrice != null && startDay
      ? t('stocks.sinceClose', { symbol: `${stock.symbol}${pct == null ? '' : ` ${pctText}`}`, day: startDay, price: usd.format(stock.startPrice) })
      : startDay
        ? t('stocks.closeNotIn', { symbol: stock.symbol, day: startDay })
        : stock.symbol;
  const up = onDark ? 'text-emerald-300' : 'text-success';
  const down = onDark ? 'text-red-300' : 'text-danger';
  // Nothing until the first quote: a "· …" placeholder read as the company's
  // name cut off. The empty span stays for the observer, taking back the
  // pill's gap-1.5 so the pill ends at the name.
  if (!bare && !quote) return <span ref={ref} className="-ml-1.5" />;
  return (
    <span ref={ref} className="inline-flex items-center gap-1 tabular-nums" title={title}>
      {bare ? null : (
        <span className={onDark ? 'text-white/40' : 'text-faint'} aria-hidden>
          ·
        </span>
      )}
      {bare && stock.startPrice != null ? (
        <span className="text-subtle">
          {t('stocks.startWas', { price: usd.format(stock.startPrice) })}
        </span>
      ) : null}
      {bare || !quote ? null : <span>{usd.format(quote.price)}</span>}
      {pct != null ? (
        bare ? (
          <span className={pct > 0 ? up : pct < 0 ? down : ''}>{pctText}</span>
        ) : (
          // "+1.02% since": only the move takes the up/down colour.
          <span>
            {t('stocks.changeSince', { pct: '\u0000' })
              .split('\u0000')
              .map((part, i) =>
                i === 0 ? (
                  part
                ) : (
                  <span key={i}>
                    <span className={pct > 0 ? up : pct < 0 ? down : ''}>{pctText}</span>
                    {part}
                  </span>
                ),
              )}
          </span>
        )
      ) : null}
    </span>
  );
}
