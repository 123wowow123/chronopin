'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useMarketOdds, watchMarketOdds } from '@/lib/client/marketOdds';
import { pinMarketRefs, type MarketOdds, type MarketOutcome } from '@/lib/predictionMarkets';
import type { PinJson } from '@/lib/types';
import { useT } from '@/lib/client/i18n';
import { compactUsd, dateFormat } from '@/lib/format';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/config';

const SHOWN_OUTCOMES = 6;
// A card has room for the leaders only.
const CARD_MARKETS = 2;
const CARD_OUTCOMES = 2;
// How long a move takes: the bar, the number counting and a row changing place.
const MOVE_MS = 700;
// How long an outcome stays green or red after it moves.
const FLASH_MS = 1600;

// In UTC: Polymarket gives an end date as midnight UTC, which reads a day
// early anywhere west of Greenwich.
const closeDate = (locale: Locale) => dateFormat(INTL_LOCALES[locale], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const updatedTime = (locale: Locale) => dateFormat(INTL_LOCALES[locale], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

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
  const markets = useMarketOdds(pinId);
  const t = useT();
  useEffect(() => watchMarketOdds(pinId), [pinId]);

  if (!markets?.length) return null;
  return (
    <section aria-labelledby="odds-heading" className="mb-4 flex flex-col gap-3">
      <h2 id="odds-heading" className="sr-only">
        {t('odds.heading')}
      </h2>
      {markets.map((market) => (
        <Market key={market.url} market={market} />
      ))}
    </section>
  );
}

// The same live odds on a timeline or search card, cut down to each market's
// leaders. Only a card near the viewport follows them, so a long timeline
// asks the server for a screenful of pins rather than all of them.
//
// Its height is known before any odds arrive: the links say how many markets
// there are and on which exchange, and every market box is two rows tall, so
// the card is drawn (on the server too) with a placeholder of the same size.
export function PinCardOdds({ pin }: { pin: Pick<PinJson, 'id' | 'sourceUrl' | 'references'> }) {
  const { id, sourceUrl, references } = pin;
  const expected = useMemo(() => pinMarketRefs({ sourceUrl, references }).slice(0, CARD_MARKETS), [sourceUrl, references]);
  const citesMarket = expected.length > 0;
  const ref = useRef<HTMLDivElement>(null);
  const markets = useMarketOdds(id);

  useEffect(() => {
    const el = ref.current;
    if (!citesMarket || !el) return;
    let stop: (() => void) | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          stop ??= watchMarketOdds(id);
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
  }, [id, citesMarket]);

  if (!citesMarket) return null;
  // Pushed as none (dead links, or the exchanges failing before any read
  // succeeded): only then does the card give the room back.
  if (markets && !markets.length) return <div ref={ref} />;
  return (
    <div ref={ref} className="mb-2 flex flex-col gap-1.5">
      {markets
        ? markets.slice(0, CARD_MARKETS).map((market) => <CardMarket key={market.url} market={market} />)
        : expected.map((market) => <CardMarket key={market.url} source={market.source} />)}
    </div>
  );
}

// A market on a card: its leading outcomes, or while the first push is on its
// way the same box with empty rows, so the two are the same height.
function CardMarket({ market, source = market?.source }: { market?: MarketOdds; source?: string }) {
  const shown = market?.outcomes.slice(0, CARD_OUTCOMES) ?? [];
  const listRef = useRef<HTMLUListElement>(null);
  const t = useT();
  useRowMoves(listRef, shown.map((o) => o.label).join('\n'));

  return (
    <div className="rounded-lg border border-line px-2 py-1.5 text-xs" aria-busy={!market || undefined}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-subtle">
        <Icon name="trending-up" className="size-3 shrink-0 text-link" />
        {market ? (
          <a href={market.url} target="_blank" rel="noopener nofollow" title={market.title} className="inline-flex min-w-0 items-center gap-1 text-muted hover:text-link hover:no-underline">
            <span className="truncate">{market.title}</span>
            <Icon name="external" className="size-3 shrink-0" />
          </a>
        ) : (
          <span className="w-2/5 animate-pulse truncate rounded bg-raised motion-reduce:animate-none">{' '}</span>
        )}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-semibold tracking-wider uppercase">
          {market?.closed ? <span className="text-warning">{t('odds.closed')}</span> : market ? <LiveDot fetchedAt={market.fetchedAt} /> : null}
          {source}
        </span>
      </div>
      <ul ref={listRef} className="flex flex-col gap-1">
        {shown.map((outcome) => (
          <Outcome key={outcome.label} outcome={outcome} compact />
        ))}
        {/* Rows a market is short of (or all of them, before it arrives). */}
        {Array.from({ length: CARD_OUTCOMES - shown.length }, (_, i) => (
          <li key={`empty-${i}`} aria-hidden className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 ${market ? 'invisible' : ''}`}>
            <span className="relative block animate-pulse rounded bg-raised px-1.5 py-0.5 motion-reduce:animate-none">{' '}</span>
            <span className="w-9">{' '}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LiveDot({ fetchedAt }: { fetchedAt: string }) {
  const t = useT();
  return <span aria-hidden title={t('odds.updated', { time: updatedTime(t.locale).format(new Date(fetchedAt)) })} className="size-1.5 shrink-0 animate-pulse rounded-full bg-success motion-reduce:animate-none" />;
}

function Market({ market }: { market: MarketOdds }) {
  const shown = market.outcomes.slice(0, SHOWN_OUTCOMES);
  const listRef = useRef<HTMLUListElement>(null);
  const t = useT();
  useRowMoves(listRef, shown.map((o) => o.label).join('\n'));

  return (
    <div className="surface px-4 py-3 text-sm">
      <div className="mb-2 flex items-start gap-2">
        <Icon name="trending-up" className="mt-0.5 size-4 shrink-0 text-link" />
        <a href={market.url} target="_blank" rel="noopener nofollow" className="inline-flex min-w-0 items-center gap-1 font-medium text-ink hover:text-link hover:no-underline">
          {market.title}
          <Icon name="external" className="size-3 shrink-0" />
        </a>
        <span className="ml-auto shrink-0 text-xs font-semibold tracking-wider text-subtle uppercase">{market.source}</span>
      </div>
      <ul ref={listRef} className="flex flex-col gap-1.5">
        {shown.map((outcome) => (
          <Outcome key={outcome.label} outcome={outcome} compact={false} />
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        {market.closed ? (
          <span className="font-semibold text-warning">{t('odds.closed')}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <LiveDot fetchedAt={market.fetchedAt} />
            {t('odds.live')}
          </span>
        )}
        {market.outcomes.length > SHOWN_OUTCOMES ? <span>{t('odds.moreOutcomes', { count: market.outcomes.length - SHOWN_OUTCOMES })}</span> : null}
        {market.volume ? <span>{t('odds.traded', { amount: compactUsd(t.locale).format(market.volume) })}</span> : null}
        {market.closeTime && !market.closed ? <span>{t('odds.closes', { date: closeDate(t.locale).format(new Date(market.closeTime)) })}</span> : null}
        <a href={market.url} target="_blank" rel="noopener nofollow" className="ml-auto inline-flex items-center gap-1 text-subtle hover:text-link hover:no-underline">
          {t('odds.viewOn', { source: market.source })}
          <Icon name="external" className="size-3" />
        </a>
      </div>
    </div>
  );
}

// One outcome's bar and chance. On a push the bar slides to its new width, the
// number counts to its new value, and both tint green or red for a moment.
function Outcome({ outcome, compact }: { outcome: MarketOutcome; compact: boolean }) {
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
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] items-center ${compact ? 'gap-x-2' : 'gap-x-3'}`}>
      <span className={`relative overflow-hidden bg-raised ${compact ? 'rounded px-1.5 py-0.5' : 'rounded-md px-2 py-1'}`}>
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
      <span className={`text-right font-semibold tabular-nums transition-colors duration-700 motion-reduce:transition-none ${compact ? 'w-9' : 'w-11'} ${text}`}>
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
