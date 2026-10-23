import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { term } from '@/lib/searchTerms';
import type { TradeRow } from '@/lib/trades';

const TOP_TICKERS = 10;
const tickerHref = (ticker: string) => `/search?q=${encodeURIComponent(term('ticker', ticker))}`;

// One Buys/Sells panel per month of a person's trades: each ticker with how many
// trades it had, a midpoint of the reported ranges, and a warning when the
// member's committees oversee its sector.
export function MonthlyTradePanels({ trades, months, t }: { trades: TradeRow[]; months: number; t: Translator }) {
  const intl = INTL_LOCALES[t.locale];
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1)).toISOString().slice(0, 10);
  const byMonth = new Map<string, TradeRow[]>();
  for (const tr of trades) {
    if (!tr.ticker || tr.txDate < from) continue;
    const key = tr.txDate.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), tr]);
  }
  if (!byMonth.size) return null;
  const money = new Intl.NumberFormat(intl, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
  const monthLabel = (key: string) => dateFormat(intl, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`));

  // The midpoint of each reported range, summed.
  const total = (rows: TradeRow[]) => rows.reduce((sum, r) => sum + ((r.amountLow ?? 0) + (r.amountHigh ?? r.amountLow ?? 0)) / 2, 0);
  const rank = (rows: TradeRow[]) => {
    const stats = new Map<string, { count: number; value: number; committees: Set<string> }>();
    for (const tr of rows) {
      const st = stats.get(tr.ticker!) ?? { count: 0, value: 0, committees: new Set<string>() };
      st.count++;
      st.value += ((tr.amountLow ?? 0) + (tr.amountHigh ?? tr.amountLow ?? 0)) / 2;
      for (const c of tr.conflicts ?? []) st.committees.add(c.committee.split(': ')[0].replace(/^(House|Senate|Joint) (Select )?Committee on (the )?/, ''));
      stats.set(tr.ticker!, st);
    }
    return [...stats].sort((a, b) => b[1].count - a[1].count || b[1].value - a[1].value || a[0].localeCompare(b[0])).slice(0, TOP_TICKERS);
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      {[...byMonth].sort((a, b) => b[0].localeCompare(a[0])).map(([key, rows]) => {
        const sides = [
          ['tradeBuys', rows.filter((r) => r.txType === 'purchase'), 'text-success'],
          ['tradeSells', rows.filter((r) => r.txType === 'sale' || r.txType === 'partial'), 'text-danger'],
        ] as const;
        return (
        <section key={key} aria-label={monthLabel(key)}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm leading-5 font-medium">
            <h3 className="font-semibold text-ink capitalize">{monthLabel(key)}</h3>
            <span className="flex gap-3 tabular-nums">
              {sides.map(([k, list, tone]) => (
                <span key={k} className={tone}>{t(`notifications.${k}`)} {list.length} · {money.format(total(list))}</span>
              ))}
            </span>
          </div>
          <div className="floating grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
            {sides.map(([k, list, tone]) => (
              <div key={k} className="min-w-0 px-4 py-3">
                <h4 className={`mb-1.5 text-xs font-semibold tracking-wide uppercase ${tone}`}>{t(`notifications.${k}`)}</h4>
                {list.length ? (
                  <ol className="text-sm sm:columns-2 sm:gap-x-8">
                    {rank(list).map(([ticker, st]) => (
                      <li key={ticker} className="mb-1 flex items-baseline gap-2 break-inside-avoid">
                        <span className="w-5 shrink-0 text-end text-xs tabular-nums text-subtle">{st.count}</span>
                        <Link href={tickerHref(ticker)} className="min-w-0 truncate font-semibold text-ink hover:underline">{ticker}</Link>
                        {st.committees.size ? (
                          <span title={`${t('notifications.conflict')}: ${[...st.committees].slice(0, 3).join(', ')}`} className="shrink-0 text-warning-soft">
                            <Icon name="warning" className="size-3" />
                            <span className="sr-only">{t('notifications.conflict')}</span>
                          </span>
                        ) : null}
                        {st.value ? <span className="ms-auto text-xs tabular-nums text-muted">{money.format(st.value)}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span className="text-sm text-subtle">—</span>
                )}
              </div>
            ))}
          </div>
        </section>
        );
      })}
    </div>
  );
}
