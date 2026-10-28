'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { useT } from '@/lib/client/i18n';
import type { MessageKey } from '@/lib/i18n/translate';
import type { TraderPositionRow } from '@/lib/traders';

type Answer =
  | { locked: true; count: number }
  | { locked: false; count: number; averagePnlPercent: number | null; positions: TraderPositionRow[] };

const VERB: Record<string, MessageKey> = { buy: 'premium.bought', sell: 'premium.sold', hold: 'premium.holding', swap: 'premium.swapped' };
const KIND: Record<string, MessageKey> = { stock: 'premium.kindStock', call: 'premium.kindCalls', put: 'premium.kindPuts', short: 'premium.kindShort' };

type Sort = 'newest' | 'oldest' | 'best' | 'worst' | 'peak' | 'drawdown';
const SORTS: { value: Sort; label: MessageKey }[] = [
  { value: 'newest', label: 'premium.sortNewest' },
  { value: 'oldest', label: 'premium.sortOldest' },
  { value: 'best', label: 'premium.sortBest' },
  { value: 'worst', label: 'premium.sortWorst' },
  { value: 'peak', label: 'premium.sortPeak' },
  { value: 'drawdown', label: 'premium.sortDrawdown' },
];

// Positions without the sorted figure (holds, unpriced tickers) always sort last on the numeric orders.
function sortPositions(rows: TraderPositionRow[], sort: Sort): TraderPositionRow[] {
  const out = [...rows];
  const byValue = (get: (r: TraderPositionRow) => number | null | undefined, dir: 1 | -1) => (a: TraderPositionRow, b: TraderPositionRow) => {
    const x = get(a);
    const y = get(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return dir * (y - x);
  };
  if (sort === 'oldest') out.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  else if (sort === 'newest') out.sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
  else if (sort === 'best') out.sort(byValue((r) => r.estimatedPnlPercent, 1));
  else if (sort === 'worst') out.sort(byValue((r) => r.estimatedPnlPercent, -1));
  else if (sort === 'peak') out.sort(byValue((r) => r.maxGainPercent, 1));
  else out.sort(byValue((r) => r.maxDrawdownPercent, -1));
  return out;
}

const pct = (v: number | null | undefined) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v}%`);
const tone = (v: number | null | undefined) => (v == null ? 'text-muted' : v >= 0 ? 'text-success' : 'text-danger');

// A trader&rsquo;s disclosed positions, estimated PnL and reasoning. Premium readers
// and admins see them; everyone else sees a prompt to go premium. Fetched per
// viewer because the person page itself is cached for everyone.
export function PremiumTrades({ slug, name, count }: { slug: string; name: string; count: number }) {
  const t = useT();
  const { status } = useSession();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (status !== 'ready') return;
    let cancelled = false;
    api.get<Answer>(`/api/traders/${slug}`).then((a) => !cancelled && setAnswer(a)).catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [slug, status]);

  return (
    <section id="premium-trades" aria-labelledby="premium-trades-heading" className="scroll-mt-20">
      <div className="mb-5 border-s-4 border-accent ps-4">
        <h2 id="premium-trades-heading" className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          {t('premium.tradesHeading', { name })}
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{t('premium.title')}</span>
        </h2>
        <p className="text-sm text-muted">{t('premium.tradesIntro')}</p>
      </div>
      {answer && !answer.locked ? <Unlocked answer={answer} /> : !answer && !failed ? <Loading /> : <Locked count={answer?.count ?? count} name={name} />}
    </section>
  );
}

// Held until the session and the per-viewer answer arrive, so a premium reader never
// sees the paywall flash before their moves load.
function Loading() {
  const t = useT();
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label={t('premium.loading')}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-[72px] animate-pulse rounded-xl border border-line bg-panel motion-reduce:animate-none" />
        <div className="h-[72px] animate-pulse rounded-xl border border-line bg-panel motion-reduce:animate-none" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-panel motion-reduce:animate-none" />
      ))}
    </div>
  );
}

function Locked({ count, name }: { count: number; name: string }) {
  const t = useT();
  return (
    <div className="surface space-y-3 p-6 text-center">
      <p className="text-lg font-semibold">{t('premium.lockedTitle', { name, count })}</p>
      <p className="mx-auto max-w-xl text-muted">{t('premium.lockedBody')}</p>
      <Link href="/premium" className="btn btn-primary">
        {t('premium.goPremium')}
      </Link>
    </div>
  );
}

function Unlocked({ answer }: { answer: Extract<Answer, { locked: false }> }) {
  const t = useT();
  const [sort, setSort] = useState<Sort>('newest');
  // Wide screens put the winners and the losers side by side; the sort applies inside each column.
  const { gains, losses, unscored } = useMemo(() => {
    const sorted = sortPositions(answer.positions, sort);
    return {
      gains: sorted.filter((p) => p.estimatedPnlPercent != null && p.estimatedPnlPercent >= 0),
      losses: sorted.filter((p) => p.estimatedPnlPercent != null && p.estimatedPnlPercent < 0),
      unscored: sorted.filter((p) => p.estimatedPnlPercent == null),
    };
  }, [answer.positions, sort]);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="floating flex flex-col gap-1 px-4 py-3">
          <span className="text-xs text-muted">{t('premium.statMoves')}</span>
          <span className="text-xl font-semibold tabular-nums">{answer.count}</span>
        </div>
        <div className="floating flex flex-col gap-1 px-4 py-3">
          <span className="text-xs text-muted">{t('premium.statAvg')}</span>
          <span className={`text-xl font-semibold tabular-nums ${tone(answer.averagePnlPercent)}`}>{pct(answer.averagePnlPercent)}</span>
        </div>
        <label className="flex items-center justify-start gap-2 text-sm text-muted sm:justify-end">
          {t('premium.sort')}
          <span className="relative inline-flex">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="appearance-none rounded-md border border-line bg-popover py-1.5 ps-2.5 pe-8 text-sm text-ink">
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.label)}
                </option>
              ))}
            </select>
            <svg aria-hidden="true" viewBox="0 0 12 12" className="pointer-events-none absolute end-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </span>
        </label>
      </div>
      <div className={gains.length && losses.length ? 'grid items-start gap-x-6 gap-y-6 lg:grid-cols-2' : ''}>
        <Group title={t('premium.gains')} rows={gains} />
        <Group title={t('premium.losses')} rows={losses} />
      </div>
      <Group title={t('premium.unscored')} rows={unscored} />
      <p className="text-xs text-muted">{t('premium.disclaimer')}</p>
    </div>
  );
}


function Group({ title, rows }: { title: string; rows: TraderPositionRow[] }) {
  if (!rows.length) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="text-sm font-semibold text-muted">
        {title} <span className="tabular-nums font-normal">({rows.length})</span>
      </h3>
      <ul className="space-y-3">
        {rows.map((p) => (
          <Position key={p.id} p={p} />
        ))}
      </ul>
    </section>
  );
}

function Position({ p }: { p: TraderPositionRow }) {
  const t = useT();
  return (
    <li className="surface space-y-1.5 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {t(VERB[p.action])} {p.ticker} <span className="text-sm font-normal text-muted">{t(KIND[p.instrument])} · {p.tradeDate}</span>
        </span>
        <span className="text-sm tabular-nums">
          {p.entryPrice != null ? <span className="text-muted">{t('premium.entry')} ${p.entryPrice.toFixed(2)} · {t('premium.entryNow')} {p.lastPrice != null ? `$${p.lastPrice.toFixed(2)}` : '—'} · </span> : null}
          <span className={`font-semibold ${tone(p.estimatedPnlPercent)}`}>{pct(p.estimatedPnlPercent)}</span>
        </span>
      </div>
      {p.maxGainPercent != null && p.maxDrawdownPercent != null ? (
        <p className="text-xs tabular-nums text-muted">
          {t('premium.sinceTrade')} {t('premium.best')} <span className="font-semibold text-success">{pct(p.maxGainPercent)}</span> · {t('premium.worst')} <span className="font-semibold text-danger">{pct(p.maxDrawdownPercent)}</span>
        </p>
      ) : null}
      <p className="text-sm">{p.summary}</p>
      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
        {t('premium.source', { title: p.sourceTitle })}
      </a>
    </li>
  );
}
