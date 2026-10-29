import Anchor from '@/components/ui/Anchor';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { safeUrl } from '@/lib/people';
import { term } from '@/lib/searchTerms';
import { formatAmountRange, type TradeRow } from '@/lib/trades';

// All transactions on the five most recent execution dates, skipping empty days.
export function LatestTrades({ trades, t }: { trades: TradeRow[]; t: Translator }) {
  const latest = [...trades].sort((a, b) => b.txDate.localeCompare(a.txDate) || b.id - a.id);
  if (!latest.length) return null;
  const groups = new Map<string, TradeRow[]>();
  for (const trade of latest) {
    if (!groups.has(trade.txDate) && groups.size === 5) break;
    groups.set(trade.txDate, [...(groups.get(trade.txDate) ?? []), trade]);
  }
  const day = (iso: string) => dateFormat(INTL_LOCALES[t.locale], { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const headingDay = (iso: string) => dateFormat(INTL_LOCALES[t.locale], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-base font-semibold">{t('person.trades.latest')}</h3>
      <div className="flex flex-col gap-4">
        {[...groups].map(([date, rows]) => (
          <section key={date} aria-label={`${t('person.trades.date')} ${headingDay(date)}`} className="surface overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-field px-4 py-3">
              <h4 className="text-sm font-semibold"><time dateTime={date}>{headingDay(date)}</time></h4>
              <span className="flex gap-3 text-xs tabular-nums">
                <span className="text-success-soft">{t('notifications.tradeBuys')} {rows.filter((r) => r.txType === 'purchase').length}</span>
                <span className="text-danger-soft">{t('notifications.tradeSells')} {rows.filter((r) => r.txType === 'sale' || r.txType === 'partial').length}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line">
              {[
                { key: 'purchase', label: t('notifications.tradeBuys'), tone: 'text-success-soft', trades: rows.filter((r) => r.txType === 'purchase') },
                { key: 'sale', label: t('notifications.tradeSells'), tone: 'text-danger-soft', trades: rows.filter((r) => r.txType === 'sale' || r.txType === 'partial') },
                ...(rows.some((r) => r.txType === 'exchange') ? [{ key: 'exchange', label: t('person.trades.types.exchange'), tone: 'text-muted', trades: rows.filter((r) => r.txType === 'exchange') }] : []),
              ].map((column) => (
                <div key={column.key} role="group" aria-label={column.label} className={`min-w-0 bg-panel ${column.key === 'exchange' ? 'col-span-2' : ''}`}>
                  <h5 className={`px-4 pt-3 text-xs font-semibold ${column.tone}`}>{column.label}</h5>
                  {column.trades.length ? <ul className="divide-y divide-line">
                    {column.trades.map((trade) => {
                      const tone = trade.txType === 'purchase'
                        ? 'bg-success/10 text-success-soft ring-success/30'
                        : trade.txType === 'exchange' ? 'bg-raised text-muted ring-line' : 'bg-danger/10 text-danger-soft ring-danger/30';
                      const source = safeUrl(trade.sourceUrl);
                      return (
                        <li key={trade.id} className="min-w-0 bg-panel p-4">
                          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-muted">{t(`person.trades.types.${trade.txType}`)}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset ${tone}`}>
                              {formatAmountRange(trade.amountLow, trade.amountHigh) || t('person.holdings.unknown')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {trade.ticker ? <Link href={`/search?q=${encodeURIComponent(term('ticker', trade.ticker))}`} className={`rounded-md px-2 py-0.5 text-sm font-semibold ring-1 ring-inset hover:underline ${tone}`}>{trade.ticker}</Link> : null}
                            <span className={`min-w-0 break-words rounded-md px-2 py-0.5 text-sm ring-1 ring-inset ${tone}`}>{trade.asset}</span>
                          </div>
                          {trade.conflicts?.length ? (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warning-soft" title={[...new Set(trade.conflicts.map((c) => c.committee))].join('; ')}>
                              <Icon name="warning" className="size-3 shrink-0" />{t('person.conflict.label')}
                            </span>
                          ) : null}
                          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-subtle">
                            {trade.chamber !== 'executive' ? <span>{t('person.trades.owner')}: {t(`person.trades.owners.${trade.owner}`)}</span> : null}
                            {source ? <Anchor href={source} title={trade.filedDate ? `${t('person.trades.filed')} ${day(trade.filedDate)}` : undefined}>{t('person.trades.filing')} ↗</Anchor> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul> : <p className="px-4 py-4 text-sm text-subtle">—</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
