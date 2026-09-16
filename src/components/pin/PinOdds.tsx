'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { MarketOdds, MarketOutcome } from '@/lib/predictionMarkets';

const SHOWN_OUTCOMES = 6;
// How long a move takes: the bar, the number counting and a row changing place.
const MOVE_MS = 700;
// How long an outcome stays green or red after it moves.
const FLASH_MS = 1600;

const compactUsd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
// In UTC: Polymarket gives an end date as midnight UTC, which reads a day
// early anywhere west of Greenwich.
const closeDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const updatedTime = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

function percent(probability: number | null): string {
  if (probability == null) return '–';
  const p = probability * 100;
  if (p > 0 && p < 1) return '<1%';
  if (p < 100 && p > 99) return '>99%';
  return `${Math.round(p)}%`;
}

function barWidth(probability: number | null): string {
  return `${Math.max(0, Math.min(1, probability ?? 0)) * 100}%`;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Odds from the Kalshi and Polymarket markets the pin cites, pushed by the
// server as they refresh (at least once a minute) for as long as the page is
// in view. Nothing when none of them answer.
export function PinOdds({ pinId }: { pinId: number }) {
  const [markets, setMarkets] = useState<MarketOdds[] | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    const open = () => {
      if (source || document.hidden) return;
      source = new EventSource(`/api/pins/${pinId}/odds/stream`);
      source.addEventListener('odds', (event) => setMarkets(JSON.parse((event as MessageEvent).data) as MarketOdds[]));
    };
    const close = () => {
      source?.close();
      source = null;
    };
    // A hidden tab lets go, so the server stops reading markets nobody sees.
    const onVisibility = () => (document.hidden ? close() : open());
    open();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      close();
    };
  }, [pinId]);

  if (!markets?.length) return null;
  return (
    <section aria-labelledby="odds-heading" className="mb-4 flex flex-col gap-3">
      <h2 id="odds-heading" className="sr-only">
        Market odds
      </h2>
      {markets.map((market) => (
        <Market key={market.url} market={market} />
      ))}
    </section>
  );
}

function Market({ market }: { market: MarketOdds }) {
  const shown = market.outcomes.slice(0, SHOWN_OUTCOMES);
  const listRef = useRef<HTMLUListElement>(null);
  useRowMoves(listRef, shown.map((o) => o.label).join('\n'));

  return (
    <div className="surface px-4 py-3 text-sm">
      <div className="mb-2 flex items-start gap-2">
        <Icon name="trending-up" className="mt-0.5 size-4 shrink-0 text-link" />
        <a href={market.url} target="_blank" rel="noopener nofollow" className="min-w-0 font-medium text-ink hover:text-link hover:no-underline">
          {market.title}
        </a>
        <span className="ml-auto shrink-0 text-xs font-semibold tracking-wider text-subtle uppercase">{market.source}</span>
      </div>
      <ul ref={listRef} className="flex flex-col gap-1.5">
        {shown.map((outcome) => (
          <Outcome key={outcome.label} outcome={outcome} />
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        {market.closed ? (
          <span className="font-semibold text-warning">Closed</span>
        ) : (
          <span className="inline-flex items-center gap-1.5" title={`Updated ${updatedTime.format(new Date(market.fetchedAt))}`}>
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
            Live
          </span>
        )}
        {market.outcomes.length > SHOWN_OUTCOMES ? <span>{market.outcomes.length - SHOWN_OUTCOMES} more outcomes</span> : null}
        {market.volume ? <span>{compactUsd.format(market.volume)} traded</span> : null}
        {market.closeTime && !market.closed ? <span>Closes {closeDate.format(new Date(market.closeTime))}</span> : null}
        <a href={market.url} target="_blank" rel="noopener nofollow" className="ml-auto inline-flex items-center gap-1 text-subtle hover:text-link hover:no-underline">
          View on {market.source}
          <Icon name="external" className="size-3" />
        </a>
      </div>
    </div>
  );
}

// One outcome's bar and chance. On a push the bar slides to its new width, the
// number counts to its new value, and both tint green or red for a moment.
function Outcome({ outcome }: { outcome: MarketOutcome }) {
  const target = outcome.probability;
  const [shown, setShown] = useState(target);
  const [trend, setTrend] = useState<'up' | 'down' | null>(null);
  const previous = useRef(target);
  const barRef = useRef<HTMLSpanElement>(null);
  const barFrom = useRef(target);

  // The bar slides with the Web Animations API rather than a CSS transition:
  // a row that changes place is moved in the DOM, which drops a transition.
  useLayoutEffect(() => {
    const from = barFrom.current;
    barFrom.current = target;
    if (from === target || !barRef.current || reducedMotion()) return;
    barRef.current.animate([{ width: barWidth(from) }, { width: barWidth(target) }], { duration: MOVE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
  }, [target]);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    if (from === target) return;
    // A chance appearing or going away just shows; only a move animates.
    const moved = from != null && target != null;
    const a = from ?? 0;
    const b = target ?? 0;
    const instant = !moved || reducedMotion();
    let start: number | null = null;
    let frame = 0;
    const step = (now: number) => {
      if (start == null) {
        start = now;
        if (moved) setTrend(b > a ? 'up' : 'down');
      }
      const t = instant ? 1 : Math.min(1, (now - start) / MOVE_MS);
      setShown(moved ? a + (b - a) * (1 - (1 - t) ** 3) : target);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const unflash = setTimeout(() => setTrend(null), FLASH_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(unflash);
    };
  }, [target]);

  const fill = trend === 'up' ? 'bg-success/30' : trend === 'down' ? 'bg-danger/30' : 'bg-link/20';
  const text = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-ink';

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
      <span className="relative overflow-hidden rounded-md bg-raised px-2 py-1">
        <span
          ref={barRef}
          aria-hidden
          className={`absolute inset-y-0 left-0 transition-colors duration-700 motion-reduce:transition-none ${fill}`}
          style={{ width: barWidth(target) }}
        />
        <span className="relative block truncate text-ink" title={outcome.label}>
          {outcome.label}
        </span>
      </span>
      <span className={`w-11 text-right font-semibold tabular-nums transition-colors duration-700 motion-reduce:transition-none ${text}`}>
        {percent(shown)}
      </span>
    </li>
  );
}

// Rows that change place on a push glide there rather than jump (a FLIP: each
// row starts drawn at its old offset and animates to the new one).
function useRowMoves(listRef: React.RefObject<HTMLUListElement | null>, order: string) {
  const offsets = useRef(new Map<Element, number>());
  useLayoutEffect(() => {
    const rows = Array.from(listRef.current?.children ?? []);
    const reduce = reducedMotion();
    const next = new Map<Element, number>();
    for (const row of rows) {
      const top = (row as HTMLElement).offsetTop;
      const before = offsets.current.get(row);
      if (before != null && before !== top && !reduce) {
        row.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], { duration: MOVE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
      }
      next.set(row, top);
    }
    offsets.current = next;
  }, [listRef, order]);
}
