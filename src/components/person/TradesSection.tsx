import Anchor from '@/components/ui/Anchor';
import { TradeWatchButton } from '@/components/person/TradeWatchButton';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { safeUrl } from '@/lib/people';
import { formatAmountRange, summarizeTrades, type TradeRow } from '@/lib/trades';

const SHOWN = 25;
const compact = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`);

// A person's disclosed stock trades: totals as tiles, then the table, each row
// linking to the filing it was read from. The watch button sits in the heading
// row, so subscribing is one click from the numbers.
export function TradesSection({ personId, name, trades, t }: { personId: number; name: string; trades: TradeRow[]; t: Translator }) {
  const summary = summarizeTrades(trades);
  const intl = INTL_LOCALES[t.locale];
  const day = (iso: string) => dateFormat(intl, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const tile = 'floating flex flex-col gap-1 px-4 py-3';
  const rows = (list: TradeRow[]) =>
    list.map((tr) => {
      const url = safeUrl(tr.sourceUrl);
      return (
        <tr key={tr.id} className="border-t border-line align-top">
          <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted">{day(tr.txDate)}</td>
          <td className="px-3 py-2">
            <span className="font-medium text-ink">{tr.ticker ?? '—'}</span>
            <span className="block max-w-xs text-xs text-subtle">{tr.asset}</span>
          </td>
          <td className="px-3 py-2 whitespace-nowrap">
            <span className={tr.txType === 'purchase' ? 'text-success' : tr.txType === 'exchange' ? 'text-muted' : 'text-danger'}>{t(`person.trades.types.${tr.txType}`)}</span>
          </td>
          <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatAmountRange(tr.amountLow, tr.amountHigh)}</td>
          <td className="px-3 py-2 whitespace-nowrap text-muted">{t(`person.trades.owners.${tr.owner}`)}</td>
          <td className="px-3 py-2 whitespace-nowrap">
            {url ? (
              <Anchor href={url} className="text-xs" title={tr.filedDate ? `${t('person.trades.filed')} ${day(tr.filedDate)}` : undefined}>
                {t('person.trades.read')}
              </Anchor>
            ) : null}
          </td>
        </tr>
      );
    });
  const head = (
    <thead>
      <tr className="text-start text-xs text-subtle">
        {(['date', 'asset', 'type', 'amount', 'owner', 'filing'] as const).map((k) => (
          <th key={k} scope="col" className="px-3 py-2 text-start font-medium">
            {t(`person.trades.${k}`)}
          </th>
        ))}
      </tr>
    </thead>
  );
  return (
    <section id="trades" aria-labelledby="trades-heading" className="scroll-mt-20">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="border-s-4 border-accent ps-4">
          <h2 id="trades-heading" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            {t('person.trades.title')}
            <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted tabular-nums">{summary.count}</span>
          </h2>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-subtle">{t('person.trades.about')}</p>
        </div>
        <TradeWatchButton personId={personId} name={name} />
      </div>

      {summary.count ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={tile}>
              <span className="text-xs text-subtle">{t('person.trades.purchases')}</span>
              <span className="text-xl font-semibold text-success tabular-nums">{summary.purchases}</span>
            </div>
            <div className={tile}>
              <span className="text-xs text-subtle">{t('person.trades.sales')}</span>
              <span className="text-xl font-semibold text-danger tabular-nums">{summary.sales}</span>
            </div>
            <div className={tile} title={t('person.trades.volumeAbout')}>
              <span className="text-xs text-subtle">{t('person.trades.volume')}</span>
              <span className="text-xl font-semibold tabular-nums">
                {compact(summary.volumeLow)} – {compact(summary.volumeHigh)}
              </span>
            </div>
            <div className={tile}>
              <span className="text-xs text-subtle">{t('person.trades.topTickers')}</span>
              <span className="flex flex-wrap gap-1.5 text-sm font-medium">
                {summary.tickers.slice(0, 5).map((x) => (
                  <span key={x.ticker} className="rounded-md bg-raised px-1.5 py-0.5 text-xs">
                    {x.ticker} <span className="text-subtle">×{x.count}</span>
                  </span>
                ))}
              </span>
            </div>
          </div>
          {summary.first && summary.last ? <p className="mb-2 text-xs text-subtle">{t('person.trades.period', { from: day(summary.first), to: day(summary.last) })}</p> : null}
          <div className="floating overflow-x-auto">
            <table className="w-full text-sm">
              {head}
              <tbody>{rows(trades.slice(0, SHOWN))}</tbody>
            </table>
          </div>
          {trades.length > SHOWN ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-accent">{t('person.trades.showMore', { count: trades.length })}</summary>
              <div className="floating mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  {head}
                  <tbody>{rows(trades.slice(SHOWN))}</tbody>
                </table>
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">{t('person.trades.none')}</p>
      )}
    </section>
  );
}
