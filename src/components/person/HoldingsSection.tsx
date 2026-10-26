import Anchor from '@/components/ui/Anchor';
import { holdingPnl, holdingsAreStale, preferredHoldings, type HoldingsSnapshot } from '@/lib/holdings';
import { dateFormat } from '@/lib/format';
import { INTL_LOCALES } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';

export function HoldingsSection({ portfolios, today, t, view = 'all' }: { portfolios: HoldingsSnapshot[]; today: string; t: Translator; view?: 'all' | 'personal' | 'related' }) {
  const id = view === 'related' ? 'related-holdings' : 'holdings';
  const visible = portfolios.filter(p => view === 'all' || (view === 'personal' ? p.scope === 'personal' : p.scope !== 'personal'));
  const intl = INTL_LOCALES[t.locale];
  const day = (iso: string) => dateFormat(intl, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const percent = (value: number, signed = false) => new Intl.NumberFormat(intl, { style: 'percent', maximumFractionDigits: 2, ...(signed ? { signDisplay: 'exceptZero' as const } : {}) }).format(value);
  const money = (value: number, currency: string) => new Intl.NumberFormat(intl, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  const unknown = t('person.holdings.unknown');
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20">
      <div className="mb-5 border-s-4 border-accent ps-4">
        <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight">{t(view === 'personal' ? 'person.holdings.personalTitle' : view === 'related' ? 'person.holdings.relatedTitle' : 'person.holdings.title')}</h2>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-subtle">{t('person.holdings.about')}</p>
      </div>
      {!visible.length ? <p className="rounded-xl border border-line bg-panel p-5 text-sm text-muted">{t(view === 'personal' ? 'person.holdings.personalNone' : 'person.holdings.none')}</p> : (
        <div className="flex flex-col gap-5">
          {preferredHoldings(visible).map(p => {
            const quantities = p.holdings.some(h => h.shares != null);
            const owners = p.holdings.some(h => h.owner != null);
            const valuations = p.holdings.some(h => h.marketValue != null || h.marketValueLow != null || h.costBasis != null);
            const performance = p.performance;
            const periods = performance ? [
              { label: t('person.holdings.monthly'), value: performance.monthly },
              { label: t('person.holdings.ytd'), value: performance.ytd },
              { label: t('person.holdings.oneYear'), value: performance.oneYear },
              { label: t('person.holdings.allTime'), value: performance.allTime },
            ].filter((v): v is { label: string; value: number } => v.value != null) : [];
            return (
              <article key={p.key} className="floating min-w-0 overflow-hidden">
                <header className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="mb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">{t(`person.holdings.${p.scope}`)}</p>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="mt-1 text-xs text-muted">{t('person.asOf', { date: day(p.asOf) })}{holdingsAreStale(p.asOf, today) ? ` · ${t('person.holdings.stale')}` : ''}</p>
                    {p.filedDate ? <p className="mt-1 text-xs text-subtle">{t('person.trades.filed')} · {day(p.filedDate)}</p> : null}
                  </div>
                  <Anchor href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs">{t('person.source')} ↗</Anchor>
                </header>
                {p.scope === 'strategy' ? <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">{t('person.holdings.strategyAbout')}</p> : null}
                {p.coverageNote ? <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">{p.coverageNote}</p> : null}
                {p.holdings.length ? (
                  <div className={p.holdings.length > 12 ? 'max-h-[32rem] overflow-auto' : 'overflow-x-auto'}>
                    <table className="w-full text-start text-sm">
                      <caption className="sr-only">{p.name} · {t('person.asOf', { date: day(p.asOf) })}</caption>
                      <thead className="sticky top-0 z-10 border-y border-line bg-raised text-xs text-subtle">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-start font-medium sm:px-5">{t('person.holdings.security')}</th>
                          {owners ? <th scope="col" className="px-4 py-3 text-start font-medium">{t('person.trades.owner')}</th> : null}
                          <th scope="col" className="px-4 py-3 text-end font-medium">{t('person.holdings.weight')}</th>
                          {quantities ? <th scope="col" className="px-4 py-3 text-end font-medium">{t('person.holdings.shares')}</th> : null}
                          {valuations ? <><th scope="col" className="px-4 py-3 text-end font-medium">{t('person.holdings.cost')}</th><th scope="col" className="px-4 py-3 text-end font-medium">{t('person.holdings.value')}</th></> : null}
                          <th scope="col" className="px-4 py-3 text-end font-medium whitespace-nowrap sm:px-5">{t('person.holdings.pnl')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {p.holdings.map(h => {
                          const pnl = holdingPnl(h);
                          return (
                            <tr key={`${h.symbol}:${h.side}:${h.owner ?? ''}`}>
                              <th scope="row" className="min-w-44 px-4 py-3 text-start font-normal sm:px-5">
                                <span className="font-semibold">{h.identifierType === 'cusip' ? `CUSIP ${h.symbol}` : h.symbol}</span>{h.side === 'short' ? <span className="ms-2 text-xs text-muted">{t('person.holdings.short')}</span> : null}
                                <span className="mt-0.5 block text-xs text-muted">{h.name}</span>
                              </th>
                              {owners ? <td className="px-4 py-3 text-start">{h.owner ? t(`person.trades.owners.${h.owner}`) : unknown}</td> : null}
                              <td className="px-4 py-3 text-end tabular-nums">{h.weightPercent != null ? percent(h.weightPercent / 100) : unknown}</td>
                              {quantities ? <td className="px-4 py-3 text-end tabular-nums">{h.shares != null ? h.shares.toLocaleString(intl, { maximumFractionDigits: 6 }) : unknown}</td> : null}
                              {valuations ? <>
                                <td className="px-4 py-3 text-end whitespace-nowrap tabular-nums">{h.costBasis != null && h.costSourceUrl ? <Anchor href={h.costSourceUrl} target="_blank" rel="noopener noreferrer">{money(h.costBasis, h.currency)}</Anchor> : unknown}</td>
                                <td className="px-4 py-3 text-end whitespace-nowrap tabular-nums">{(h.marketValue != null || h.marketValueLow != null) && h.valueSourceUrl ? <><Anchor href={h.valueSourceUrl} target="_blank" rel="noopener noreferrer">{h.marketValue != null ? money(h.marketValue, h.currency) : h.marketValueHigh != null ? `${money(h.marketValueLow!, h.currency)} – ${money(h.marketValueHigh, h.currency)}` : `> ${money(h.marketValueLow!, h.currency)}`}</Anchor><span className="mt-0.5 block text-[10px] text-subtle">{h.valuationDate ? day(h.valuationDate) : ''}</span></> : unknown}</td>
                              </> : null}
                              <td className="px-4 py-3 text-end whitespace-nowrap tabular-nums sm:px-5">
                                {pnl ? <><span className={pnl.amount > 0 ? 'text-success' : pnl.amount < 0 ? 'text-danger' : 'text-ink'}>{money(pnl.amount, h.currency)}<span className="mt-0.5 block text-xs">{percent(pnl.percent / 100, true)}</span></span><span className="sr-only">{t('person.holdings.unrealized')}</span></> : <span className="text-xs text-subtle">{unknown}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="px-4 pb-3 text-sm text-muted sm:px-5">{t('person.holdings.none')}</p>}
                {!p.complete ? <p className="border-t border-line px-4 py-3 text-xs text-muted sm:px-5">{t('person.holdings.partial')}{p.undisclosedCount != null ? ` · ${t('person.holdings.otherCount', { count: p.undisclosedCount })}` : ''}{p.undisclosedWeightPercent != null ? ` (${percent(p.undisclosedWeightPercent / 100)})` : ''}</p> : null}
                <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-subtle sm:px-5">{t('person.holdings.pnlAbout')}</p>
                {performance && periods.length ? (
                  <div className="border-t border-line px-4 py-4 sm:px-5">
                    <h4 className="text-sm font-medium">{t('person.holdings.return')}</h4>
                    <p className="mt-1 text-xs text-subtle">{t('person.asOf', { date: day(performance.asOf) })}{performance.startDate ? ` · ${t('person.holdings.since', { date: day(performance.startDate) })}` : ''}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {periods.map(period => <div key={period.label} className="rounded-lg bg-raised px-3 py-2"><dt className="text-xs text-subtle">{period.label}</dt><dd className={`mt-1 font-semibold tabular-nums ${period.value > 0 ? 'text-success' : period.value < 0 ? 'text-danger' : 'text-ink'}`}>{percent(period.value, true)}</dd></div>)}
                    </dl>
                    <details className="mt-3 text-xs text-subtle"><summary className="cursor-pointer">{t('person.holdings.methodology')}</summary><p className="mt-2 max-w-4xl leading-relaxed">{performance.disclosure}</p></details>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
