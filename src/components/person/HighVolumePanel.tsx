'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useRefreshTick } from '@/lib/client/refreshTick';
import { useIntlLocale, useT } from '@/lib/client/i18n';
import { ADV_DAYS, HIGH_VOLUME_MULTIPLE, HIGH_VOLUME_SYMBOLS, type HighVolumeDay, type Trend } from '@/lib/highVolume';
import { term } from '@/lib/searchTerms';

type Result = { stocks: { symbol: string; days: HighVolumeDay[]; trend: Trend }[] };

const SHOWN = 8;

const PANELS = [
  { up: true, title: 'notifications.highVolume', hint: 'notifications.highVolumeHint', tone: 'text-success-soft' },
  { up: false, title: 'notifications.highVolumeDown', hint: 'notifications.highVolumeDownHint', tone: 'text-danger-soft' },
] as const;

// The trades page's stocks that had a high-volume day in the span it shows: a
// panel of up days above one of down days, read together.
// `conflicts` names, per ticker, the committees that oversee a sector it was
// traded in: those tickers carry the page's warning symbol. `own` are the
// reader's tickers: checked too, listed first and coloured apart.
export function HighVolumePanel({ symbols, own, days, conflicts, className = '' }: { symbols: string[]; own: string[]; days: number; conflicts: Map<string, Set<string>>; className?: string }) {
  const key = [...new Set([...symbols, ...own])].sort().join(',');
  const request = `${days}|${key}`;
  // The answer and the request it answers: an older one reads as loading.
  const [state, setState] = useState<{ request: string; result: Result | null } | null>(null);
  const load = useCallback(async () => {
    const list = key ? key.split(',') : [];
    const batches = Array.from({ length: Math.ceil(list.length / HIGH_VOLUME_SYMBOLS) }, (_, i) => list.slice(i * HIGH_VOLUME_SYMBOLS, (i + 1) * HIGH_VOLUME_SYMBOLS));
    try {
      const results: (Result & { unchecked: string[] })[] = [];
      // One batch at a time, so a long list does not flood the price source.
      for (const batch of batches) {
        results.push(await api.get<Result & { unchecked: string[] }>(`/api/trades/high-volume?days=${days}&symbols=${encodeURIComponent(batch.join(','))}`));
      }
      // No prices for any of them is a failure, not "none qualified".
      if (list.length && results.flatMap((r) => r.unchecked).length === list.length) return null;
      return { stocks: results.flatMap((r) => r.stocks) };
    } catch {
      return null;
    }
  }, [key, days]);
  const run = useCallback(() => {
    let stale = false;
    setState(null);
    void load().then((result) => {
      if (!stale) setState({ request, result });
    });
    return () => {
      stale = true;
    };
  }, [load, request]);
  useEffect(() => {
    let cancel: (() => void) | undefined;
    const id = window.setTimeout(() => (cancel = run()), 0);
    return () => {
      window.clearTimeout(id);
      cancel?.();
    };
  }, [run]);
  // A re-read of an open page: the rows stay until the new answer replaces
  // them, and a failed one leaves them be.
  const tick = useRefreshTick();
  const refreshed = useRef(tick);
  useEffect(() => {
    if (refreshed.current === tick) return;
    refreshed.current = tick;
    let stale = false;
    void load().then((result) => {
      if (!stale && result) setState({ request, result });
    });
    return () => {
      stale = true;
    };
  }, [tick, load, request]);

  if (!key) return null;
  const current = state?.request === request ? state : null;
  // Stocks with both kinds of day in the span, so listed in both panels.
  const both = new Set(current?.result?.stocks.filter((s) => PANELS.every((p) => s.days.some((d) => d.change > 0 === p.up))).map((s) => s.symbol));
  return (
    <div className={`flex min-w-0 flex-col gap-4 ${className}`}>
      {PANELS.map((panel) => (
        <Panel
          key={panel.title}
          {...panel}
          // Null while loading; a failed read has no stocks.
          stocks={current ? current.result && sideOf(current.result.stocks, panel.up, own) : undefined}
          onRetry={run}
          conflicts={conflicts}
          own={own}
          both={both}
        />
      ))}
    </div>
  );
}

// Each stock's days that went one way: the reader's tickers first, then the
// newest such day.
function sideOf(stocks: Result['stocks'], up: boolean, own: string[]): Result['stocks'] {
  return stocks
    .map((stock) => ({ ...stock, days: stock.days.filter((d) => d.change > 0 === up) }))
    .filter((s) => s.days.length)
    .sort((a, b) => Number(own.includes(b.symbol)) - Number(own.includes(a.symbol)) || b.days[0].day.localeCompare(a.days[0].day) || b.days[0].multiple - a.days[0].multiple);
}

// One row per stock with its newest day. `stocks` is undefined while loading and
// null when the prices could not be read.
function Panel({ title, hint, tone, stocks, onRetry, conflicts, own, both }: (typeof PANELS)[number] & { stocks: Result['stocks'] | null | undefined; onRetry: () => void; conflicts: Map<string, Set<string>>; own: string[]; both: Set<string> }) {
  const t = useT();
  const locale = useIntlLocale();
  const [all, setAll] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const aboutId = useId();
  // The info text: the rule, then what a row's day count and columns mean.
  const about = [
    t(hint, { multiple: HIGH_VOLUME_MULTIPLE, days: ADV_DAYS }),
    t('notifications.highVolumeBothHint'),
    t('notifications.highVolumeDaysHint', { example: t('notifications.highVolumeDays', { count: 3 }) }),
    t('notifications.highVolumeChangeHint'),
    t('notifications.highVolumeMovedHint'),
    t('notifications.highVolumeSinceHint'),
    t('notifications.highVolumeTrendHint'),
  ];
  // A session's day is a calendar date: formatted in UTC so it never shifts.
  const date = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'always' });
  // A move since the day: none yet on the latest day, so zero takes no sign.
  const moved = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
  const times = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const note = 'px-4 py-4 text-center text-sm text-subtle';
  return (
    <section className="surface min-w-0 overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <h2 className="flex items-center gap-1 text-xs font-semibold tracking-wide text-ink uppercase">
          {t(title)}
          <button
            type="button"
            onClick={() => setExplaining((v) => !v)}
            aria-expanded={explaining}
            aria-controls={aboutId}
            aria-label={t('notifications.highVolumeAbout')}
            title={about.join('\n')}
            className={`-my-1 rounded-full p-1 hover:bg-raised hover:text-ink ${explaining ? 'text-link' : 'text-subtle'}`}
          >
            <Icon name="info" className="size-3.5" />
          </button>
        </h2>
        {explaining ? (
          <div id={aboutId} className="mt-2 rounded-lg border border-line bg-raised/40 px-3 py-2.5 text-xs leading-relaxed text-muted">
            {about.map((line) => <p key={line}>{line}</p>)}
          </div>
        ) : null}
      </div>
      {stocks === undefined ? (
        <div role="status" className={note}>{t('common.loading')}</div>
      ) : !stocks ? (
        <div role="alert" className={note}>
          {t('common.somethingWrong')}{' '}
          <button type="button" className="text-link" onClick={onRetry}>{t('common.retry')}</button>
        </div>
      ) : !stocks.length ? (
        <div className={note}>{t('notifications.highVolumeEmpty')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full text-sm whitespace-nowrap tabular-nums ${stocks.length > SHOWN ? '' : 'mb-2'}`}>
            <thead className="text-[11px] tracking-wide text-subtle uppercase">
              <tr className="border-b border-line">
                <th scope="col" className="ps-4 pe-1 py-1 text-start font-medium">{t('notifications.highVolumeStock')}</th>
                <th scope="col" className="px-1.5 py-1 text-end font-medium">{t('notifications.highVolumeDay')}</th>
                <th scope="col" className="px-1.5 py-1 text-end font-medium">{t('notifications.highVolumeChange')}</th>
                <th scope="col" className="px-1.5 py-1 text-end font-medium">{t('notifications.highVolumeVolume')}</th>
                <th scope="col" className="px-1.5 py-1 text-end font-medium">{t('notifications.highVolumeMoved')}</th>
              <th scope="col" className="px-1.5 py-1 text-end font-medium">{t('notifications.highVolumeSince')}</th>
              <th scope="col" className="ps-1 pe-4 py-1 text-center font-medium">{t('notifications.highVolumeTrend')}</th>
              </tr>
            </thead>
            <tbody>
              {(all ? stocks : stocks.slice(0, SHOWN)).map(({ symbol, days: hits, trend }) => (
                <tr key={symbol}>
                  <th scope="row" className="ps-4 pe-1 py-0.5 text-start font-semibold">
                    <Link
                      href={`/search?q=${encodeURIComponent(term('ticker', symbol))}`}
                      // A stock in both panels is paler: gray, or light purple for one of the reader's own.
                      className={`hover:underline ${own.includes(symbol) ? (both.has(symbol) ? 'text-own-ticker/55' : 'text-own-ticker') : both.has(symbol) ? 'text-faint' : 'text-ink'}`}
                      title={both.has(symbol) ? t('notifications.highVolumeBothHint') : undefined}
                    >
                      {symbol}
                    </Link>
                    {conflicts.has(symbol) ? (
                      <span title={`${t('notifications.conflict')}: ${[...conflicts.get(symbol)!].slice(0, 3).join(', ')}`} className="ms-1 inline-block align-[-1px] text-warning-soft">
                        <Icon name="warning" className="size-3" />
                        <span className="sr-only">{t('notifications.conflict')}</span>
                      </span>
                    ) : null}
                    {hits.length > 1 ? (
                      <span className="ms-1 text-[11px] font-medium text-subtle" title={hits.map((h) => date.format(new Date(h.day))).join(', ')}>
                        {t('notifications.highVolumeDays', { count: hits.length })}
                      </span>
                    ) : null}
                  </th>
                  <td className="px-1.5 py-0.5 text-end text-muted">{date.format(new Date(hits[0].day))}</td>
                  <td className={`px-1.5 py-0.5 text-end ${tone}`}>{percent.format(hits[0].change)}</td>
                  <td className="px-1.5 py-0.5 text-end text-ink">{times.format(hits[0].multiple)}×</td>
                <td className={`px-1.5 py-0.5 text-end ${hits[0].sinceChange > 0 ? 'text-success-soft' : hits[0].sinceChange < 0 ? 'text-danger-soft' : 'text-subtle'}`}>{moved.format(hits[0].sinceChange)}</td>
                  <td className="px-1.5 py-0.5 text-end" title={t('notifications.highVolumeSinceValue', { up: hits[0].up, down: hits[0].down })}>
                    <span aria-hidden>
                      <span className={hits[0].up ? 'text-success-soft' : 'text-subtle'}>▲{hits[0].up}</span>
                      <span className={`ms-1.5 ${hits[0].down ? 'text-danger-soft' : 'text-subtle'}`}>▼{hits[0].down}</span>
                    </span>
                    <span className="sr-only">{t('notifications.highVolumeSinceValue', { up: hits[0].up, down: hits[0].down })}</span>
                  </td>
                {/* An arrow alone, to keep the column narrow; blank when the latest close was unchanged. */}
                <td
                  className={`ps-1 pe-4 py-0.5 text-center ${trend?.dir === 'down' ? 'text-danger-soft' : 'text-success-soft'} ${trend && trend.days < 3 ? 'opacity-25' : ''}`}
                  title={trend ? t('notifications.highVolumeTrendValue', { dir: t(trend.dir === 'up' ? 'notifications.highVolumeTrendUp' : 'notifications.highVolumeTrendDown'), count: trend.days }) : undefined}
                >
                  {trend ? (
                    <>
                      <span aria-hidden>{trend.dir === 'up' ? '▲' : '▼'}{trend.days}</span>
                      <span className="sr-only">{t('notifications.highVolumeTrendValue', { dir: t(trend.dir === 'up' ? 'notifications.highVolumeTrendUp' : 'notifications.highVolumeTrendDown'), count: trend.days })}</span>
                    </>
                  ) : null}
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {stocks && stocks.length > SHOWN ? (
        <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} className="mt-1 w-full border-t border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-raised/50">
          {all ? t('common.showLess') : t('common.showMore')}
        </button>
      ) : null}
    </section>
  );
}
