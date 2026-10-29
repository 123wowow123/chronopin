'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/client/i18n';
import { useNow } from '@/lib/client/now';
import { moodOf, type Mood } from '@/lib/commentMood';
import { hostOf } from './reviewHost';

export type ReviewSentimentPoint = { at: number; value: number; title: string; url: string; quote: string | null };

// How close the pointer must come to a dot (in px) to pick it.
const REACH = 14;


const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

const HEIGHT = 96;
const PAD_X = 6;
const PAD_Y = 7;

const MOOD_LABELS = { positive: 'reviews.sentimentPositive', mixed: 'reviews.sentimentMixed', negative: 'reviews.sentimentNegative' } as const;
const MOOD_BADGES: Record<Mood, string> = {
  positive: 'bg-success/10 text-success ring-success/25',
  mixed: 'bg-raised text-ink ring-line',
  negative: 'bg-danger/10 text-danger ring-danger/25',
};
const MOOD_DOTS: Record<Mood, string> = { positive: 'bg-success', mixed: 'bg-subtle', negative: 'bg-danger' };

// How the independent reviews scraped for a product (the ones kept beside its
// rubric, PinReview in src/lib/pinReviews.ts) have read over time: each
// review's -1..1 sentiment at its publication day, a faint dot apiece, and a
// line through the running average so the drift shows without one review
// dragging it. The badge is the overall tone; the numbers are also in a table
// for screen readers.
export function PinReviewSentiment({
  points: given,
  selected = null,
  onSelect,
  embedded = false,
  className = '',
}: {
  points: ReviewSentimentPoint[];
  // The review chosen in the list, ringed on the graph; clicking a dot calls onSelect with its url.
  selected?: string | null;
  onSelect?: (url: string) => void;
  // Part of a rubric card: no card of its own.
  embedded?: boolean;
  className?: string;
}) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // The dot under the pointer, or the one tapped/focused last.
  const [hot, setHot] = useState<ReviewSentimentPoint | null>(null);
  // Zero while rendering on the server and hydrating, so Today only comes in in the browser.
  const now = useNow(60 * 60 * 1000);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const points = useMemo(() => [...given].sort((a, b) => a.at - b.at), [given]);
  const running = useMemo(() => {
    return points.reduce<{ at: number; value: number; sum: number }[]>((rows, p, i) => {
      const sum = (rows[i - 1]?.sum ?? 0) + p.value;
      rows.push({ at: p.at, value: sum / (i + 1), sum });
      return rows;
    }, []).map(({ at, value }) => ({ at, value }));
  }, [points]);
  if (!points.length) return null;

  const selectedPoint = selected ? points.find((p) => p.url === selected) : undefined;
  const average = running[running.length - 1].value;
  const mood = moodOf(average);

  // The span the plot covers, never narrower than a month so reviews from one
  // day are not squeezed onto one line.
  let from = points[0].at;
  let to = points[points.length - 1].at;
  const minSpan = 31 * 86400000;
  if (to - from < minSpan) {
    const mid = (from + to) / 2;
    from = mid - minSpan / 2;
    to = mid + minSpan / 2;
  }
  const x = (at: number) => PAD_X + ((at - from) / (to - from)) * Math.max(1, width - 2 * PAD_X);
  const y = (value: number) => PAD_Y + ((1 - value) / 2) * (HEIGHT - 2 * PAD_Y);
  const line = running.map((b, i) => `${i ? 'L' : 'M'}${x(b.at).toFixed(1)},${y(b.value).toFixed(1)}`).join('');
  // The dot nearest the pointer, if it is near enough.
  const pick = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    let best: ReviewSentimentPoint | null = null;
    let bestDistance = REACH;
    for (const point of points) {
      const distance = Math.hypot(x(point.at) - px, y(point.value) - py);
      if (distance < bestDistance) [best, bestDistance] = [point, distance];
    }
    setHot(best);
  };
  const monthOf = (at: number) => new Date(at).toLocaleDateString(t.locale, { year: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayOf = (at: number) => new Date(at).toLocaleDateString(t.locale, { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <section aria-labelledby="review-sentiment-heading" className={`${embedded ? '' : 'surface px-4 py-3'} ${className}`}>
      <h2 id="review-sentiment-heading" className="flex flex-wrap items-center gap-2 text-base font-semibold">
        {t('company.sentiment')}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ring-inset ${MOOD_BADGES[mood]}`}>
          <span className={`size-1.5 rounded-full ${MOOD_DOTS[mood]}`} />
          {t(MOOD_LABELS[mood])}
        </span>
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-3 rounded-full bg-tone-news" />
          {t('reviews.sentiment')}
        </span>
      </div>
      <div ref={boxRef} className="relative mt-2" style={{ height: HEIGHT + 16 }}>
        {width ? (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={t('company.sentiment')}
            className="block overflow-visible"
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setHot(null)}
            // A dot leads to the review it stands for.
            onClick={() => hot && (onSelect ? onSelect(hot.url) : window.open(hot.url, '_blank', 'noopener,noreferrer'))}
            style={{ cursor: hot ? 'pointer' : undefined }}
          >
            {/* Good at the top, bad at the bottom, and the neutral line between. */}
            <line x1={0} x2={width} y1={y(0)} y2={y(0)} className="stroke-line" strokeWidth={1} />
            <text x={0} y={PAD_Y - 1} dominantBaseline="middle" className="fill-subtle text-[10px]">
              {t('company.sentimentGood')}
            </text>
            <text x={0} y={HEIGHT - PAD_Y + 1} dominantBaseline="middle" className="fill-subtle text-[10px]">
              {t('company.sentimentBad')}
            </text>
            {now > from && now < to ? (
              <g>
                <line x1={x(now)} x2={x(now)} y1={0} y2={HEIGHT} className="stroke-line" strokeWidth={1} />
                <text
                  x={x(now) > width - 36 ? x(now) - 3 : x(now) + 3}
                  y={PAD_Y - 1}
                  dominantBaseline="middle"
                  textAnchor={x(now) > width - 36 ? 'end' : 'start'}
                  className="fill-subtle text-[10px]"
                >
                  {t('company.sentimentToday')}
                </text>
              </g>
            ) : null}
            {points.map((p, i) => (
              <circle key={i} cx={x(p.at)} cy={y(p.value)} r={3.5} className="fill-tone-news" fillOpacity={0.4} />
            ))}
            {running.length > 1 ? <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-tone-news" /> : null}
            <circle cx={x(running[running.length - 1].at)} cy={y(average)} r={4} strokeWidth={2} className="fill-tone-news stroke-panel" />
            {selectedPoint ? <circle cx={x(selectedPoint.at)} cy={y(selectedPoint.value)} r={6.5} strokeWidth={2} fill="none" className="stroke-tone-news" pointerEvents="none" /> : null}
            {/* The dot under the pointer, whole and ringed in the panel's colour. */}
            {hot ? <circle cx={x(hot.at)} cy={y(hot.value)} r={5} strokeWidth={2} className="fill-tone-news stroke-panel" pointerEvents="none" /> : null}
          </svg>
        ) : null}
        {width ? (
          <div aria-hidden className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-subtle tabular-nums">
            <span>{monthOf(from)}</span>
            {monthOf(from) !== monthOf(to) ? <span>{monthOf(to)}</span> : null}
          </div>
        ) : null}
        {hot ? <ReviewTooltip point={hot} x={x(hot.at)} y={y(hot.value)} width={width} day={dayOf(hot.at)} /> : null}
      </div>
      <table className="sr-only">
        <caption>{t('company.sentiment')}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">
                <a href={p.url}>{p.title}</a>
                {` · ${dayOf(p.at)}`}
              </th>
              <td>{p.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// The review a dot stands for: its score and day, the page it is on, and the
// quoted extract. Clicking the dot selects its review in the list.
function ReviewTooltip({ point, x, y, width, day }: { point: ReviewSentimentPoint; x: number; y: number; width: number; day: string }) {
  const box = 224;
  const left = Math.min(Math.max(0, x - box / 2), Math.max(0, width - box));
  // Above the dot unless it is too near the top for the card to fit.
  const above = y > 70;
  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs shadow-lg shadow-shade/40"
      style={{ left, width: box, ...(above ? { bottom: HEIGHT + 16 - y + 10 } : { top: y + 10 }) }}
    >
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full bg-tone-news" />
        <span className="font-semibold text-ink tabular-nums">{signed(point.value)}</span>
        <span className="text-subtle">{day}</span>
      </span>
      <span className="mt-0.5 line-clamp-2 font-medium text-ink">{point.title}</span>
      <span className="text-subtle">{hostOf(point.url)}</span>
      {point.quote ? <q className="mt-0.5 line-clamp-4 text-muted">{point.quote}</q> : null}
    </div>
  );
}
