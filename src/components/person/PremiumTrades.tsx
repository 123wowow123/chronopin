'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import type { TraderPositionRow } from '@/lib/traders';

type Answer =
  | { locked: true; count: number }
  | { locked: false; count: number; averagePnlPercent: number | null; positions: TraderPositionRow[] };

const VERB: Record<string, string> = { buy: 'Bought', sell: 'Sold', hold: 'Holding', swap: 'Swapped into' };
const KIND: Record<string, string> = { stock: 'Stock', call: 'Calls', put: 'Puts', short: 'Short' };

type Sort = 'newest' | 'oldest' | 'best' | 'worst' | 'peak' | 'drawdown';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'best', label: 'Best PnL' },
  { value: 'worst', label: 'Worst PnL' },
  { value: 'peak', label: 'Highest peak' },
  { value: 'drawdown', label: 'Deepest drawdown' },
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
          {name}&rsquo;s portfolio moves
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">Premium</span>
        </h2>
        <p className="text-sm text-muted">Disclosed trades with an estimated PnL and our summary of the reasoning, linked to the source post.</p>
      </div>
      {answer && !answer.locked ? <Unlocked answer={answer} /> : !answer && !failed ? <Loading /> : <Locked count={answer?.count ?? count} name={name} />}
    </section>
  );
}

// Held until the session and the per-viewer answer arrive, so a premium reader never
// sees the paywall flash before their moves load.
function Loading() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading moves">
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
  return (
    <div className="surface space-y-3 p-6 text-center">
      <p className="text-lg font-semibold">Go premium to unlock {name}&rsquo;s {count} tracked {count === 1 ? 'move' : 'moves'}</p>
      <p className="mx-auto max-w-xl text-muted">Positions, an estimated PnL on each, a short summary of the reasoning, and a live alert the moment a new trade is disclosed. $20 a month, cancel any time.</p>
      <Link href="/premium" className="btn btn-primary">
        Go premium
      </Link>
    </div>
  );
}

function Unlocked({ answer }: { answer: Extract<Answer, { locked: false }> }) {
  const [sort, setSort] = useState<Sort>('newest');
  const positions = useMemo(() => sortPositions(answer.positions, sort), [answer.positions, sort]);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="floating flex flex-col gap-1 px-4 py-3">
          <span className="text-xs text-muted">Tracked moves</span>
          <span className="text-xl font-semibold tabular-nums">{answer.count}</span>
        </div>
        <div className="floating flex flex-col gap-1 px-4 py-3">
          <span className="text-xs text-muted">Avg. estimated PnL on opening trades</span>
          <span className={`text-xl font-semibold tabular-nums ${tone(answer.averagePnlPercent)}`}>{pct(answer.averagePnlPercent)}</span>
        </div>
        <label className="flex items-center justify-start gap-2 text-sm text-muted sm:justify-end">
          Sort
          <span className="relative inline-flex">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="appearance-none rounded-md border border-line bg-popover py-1.5 ps-2.5 pe-8 text-sm text-ink">
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg aria-hidden="true" viewBox="0 0 12 12" className="pointer-events-none absolute end-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </span>
        </label>
      </div>
      <ul className="space-y-3">
        {positions.map((p) => (
          <li key={p.id} className="surface space-y-1.5 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">
                {VERB[p.action]} {p.ticker} <span className="text-sm font-normal text-muted">{KIND[p.instrument]} · {p.tradeDate}</span>
              </span>
              <span className="text-sm tabular-nums">
                {p.entryPrice != null ? <span className="text-muted">entry ≈ ${p.entryPrice.toFixed(2)} · now {p.lastPrice != null ? `$${p.lastPrice.toFixed(2)}` : '—'} · </span> : null}
                <span className={`font-semibold ${tone(p.estimatedPnlPercent)}`}>{pct(p.estimatedPnlPercent)}</span>
              </span>
            </div>
            {p.maxGainPercent != null && p.maxDrawdownPercent != null ? (
              <p className="text-xs tabular-nums text-muted">
                Since the trade: best <span className="font-semibold text-success">{pct(p.maxGainPercent)}</span> · worst <span className="font-semibold text-danger">{pct(p.maxDrawdownPercent)}</span>
              </p>
            ) : null}
            <p className="text-sm">{p.summary}</p>
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
              Source: {p.sourceTitle}
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        PnL is our estimate: the move from the closing price on the trade date to the latest delayed quote, with puts and shorts reversed. A hold is scored from the date it was disclosed; a sell is scored as an exit, so a gain means the price fell after the sale. Best and worst are the extremes since the trade date, using each session&rsquo;s intraday high and low. The headline average counts opening trades only. Options are marked by their underlying&rsquo;s move, not their own premium. It is not the trader&rsquo;s own result, and none of this is investment advice.
      </p>
    </div>
  );
}
