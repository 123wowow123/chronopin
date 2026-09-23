'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { useNow } from '@/lib/client/now';
import { moodOf } from '@/lib/commentMood';
import {
  averageByPeriod,
  bucketUnit,
  explainSentiment,
  type CompanySentiment,
  type ExplainedPin,
  type SentimentBucket,
  type SentimentPoint,
} from '@/lib/companySentiment';
import { pinPath } from '@/lib/seo';

// The plot's height, and the room the edges keep so a dot on -1 or 1, or at
// the first or last date, is drawn whole.
const HEIGHT = 112;
const PAD_X = 6;
const PAD_Y = 7;
// How close the pointer must come to a dot (in px) for its tooltip.
const REACH = 14;

type Plotted = { kind: 'pin'; id: number; title: string; at: number; value: number } | { kind: 'comment'; at: number; value: number };

const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

// How a company's pins have read as news over time, and how its comments
// read: a dot per pin at when its event happens, a dot per comment at when it
// was written, and the average per month or year as a line through each
// (src/lib/companySentiment.ts). Hovering a dot names it; a pin's dot leads
// to the pin. The same numbers are in a table for screen readers.
export function CompanySentimentChart({ name, sentiment }: { name: string; sentiment: CompanySentiment }) {
  const t = useT();
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hot, setHot] = useState<Plotted | null>(null);
  // The info button's explanation, folded out under the heading.
  const [explaining, setExplaining] = useState(false);
  const explainId = useId();
  // Zero while rendering on the server and hydrating, so the Today line only
  // comes in once the browser knows when now is.
  const now = useNow(60 * 60 * 1000);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const pins = useMemo<Plotted[]>(() => sentiment.pins.map((p) => ({ kind: 'pin', id: p.id, title: p.title, at: Date.parse(p.at), value: p.value })), [sentiment.pins]);
  const comments = useMemo<Plotted[]>(() => sentiment.comments.map((c) => ({ kind: 'comment', at: Date.parse(c.at), value: c.value })), [sentiment.comments]);
  const all = useMemo<SentimentPoint[]>(() => [...pins, ...comments], [pins, comments]);
  const unit = bucketUnit(all);
  const newsLine = useMemo(() => averageByPeriod(pins, unit), [pins, unit]);
  const commentLine = useMemo(() => averageByPeriod(comments, unit), [comments, unit]);

  if (!all.length) return null;

  // The dates the plot spans, a little wider than the points so none sits on
  // the edge, and never narrower than a month.
  const times = all.map((p) => p.at);
  let from = Math.min(...times);
  let to = Math.max(...times);
  const minSpan = 31 * 86400000;
  if (to - from < minSpan) {
    const mid = (from + to) / 2;
    from = mid - minSpan / 2;
    to = mid + minSpan / 2;
  }
  const x = (at: number) => PAD_X + ((at - from) / (to - from)) * Math.max(1, width - 2 * PAD_X);
  const y = (value: number) => PAD_Y + ((1 - value) / 2) * (HEIGHT - 2 * PAD_Y);
  const line = (buckets: SentimentBucket[]) => buckets.map((b, i) => `${i ? 'L' : 'M'}${x(b.at).toFixed(1)},${y(b.value).toFixed(1)}`).join('');

  const locale = t.locale;
  const yearOf = (at: number) => new Date(at).toLocaleDateString(locale, { year: 'numeric', timeZone: 'UTC' });
  const dayOf = (at: number) => new Date(at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const periodOf = (at: number) =>
    new Date(at).toLocaleDateString(locale, unit === 'month' ? { year: 'numeric', month: 'short', timeZone: 'UTC' } : { year: 'numeric', timeZone: 'UTC' });

  // The dot nearest the pointer, if it is near enough.
  const plotted = [...pins, ...comments];
  const pick = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    let best: Plotted | null = null;
    let bestDistance = REACH;
    for (const point of plotted) {
      const distance = Math.hypot(x(point.at) - px, y(point.value) - py);
      if (distance < bestDistance) [best, bestDistance] = [point, distance];
    }
    setHot(best);
  };

  const showToday = now > from && now < to;

  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="flex items-center gap-1 text-xs font-medium text-ink">
        {t('company.sentiment')}
        <button
          type="button"
          onClick={() => setExplaining(!explaining)}
          aria-expanded={explaining}
          aria-controls={explainId}
          aria-label={t('company.sentimentAbout')}
          title={t('company.sentimentAbout')}
          className={`-my-1 rounded-full p-1 hover:bg-raised hover:text-ink ${explaining ? 'text-link' : 'text-subtle'}`}
        >
          <Icon name="info" className="size-3.5" />
        </button>
      </figcaption>
      {explaining ? <Explanation id={explainId} name={name} sentiment={sentiment} now={now} /> : null}

      {/* Legend: a line key per series, the text in text colours. */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
        {pins.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 rounded-full bg-tone-news" />
            {t('company.sentimentNews')}
          </span>
        ) : null}
        {comments.length ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3 rounded-full bg-tone-comments" />
            {t('company.sentimentComments')}
          </span>
        ) : null}
      </div>

      <div ref={boxRef} className="relative" style={{ height: HEIGHT + 16 }}>
        {width ? (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={t('company.sentimentChart', { name })}
            className="block overflow-visible"
            onPointerMove={pick}
            onPointerLeave={() => setHot(null)}
            // A pin's dot leads to the pin.
            onClick={() => hot?.kind === 'pin' && router.push(pinPath(hot))}
            style={{ cursor: hot?.kind === 'pin' ? 'pointer' : undefined }}
          >
            {/* Good at the top, bad at the bottom, and the neutral line between. */}
            <line x1={0} x2={width} y1={y(0)} y2={y(0)} className="stroke-line" strokeWidth={1} />
            <text x={0} y={PAD_Y - 1} dominantBaseline="middle" className="fill-subtle text-[10px]">
              {t('company.sentimentGood')}
            </text>
            <text x={0} y={HEIGHT - PAD_Y + 1} dominantBaseline="middle" className="fill-subtle text-[10px]">
              {t('company.sentimentBad')}
            </text>
            {showToday ? (
              <g>
                <line x1={x(now)} x2={x(now)} y1={0} y2={HEIGHT} className="stroke-line" strokeWidth={1} />
                <text x={x(now) + 3} y={PAD_Y - 1} dominantBaseline="middle" className="fill-subtle text-[10px]">
                  {t('company.sentimentToday')}
                </text>
              </g>
            ) : null}

            {/* Each pin and comment, faint, so the averages read through them. */}
            {pins.map((p, i) => (
              <circle key={`p${i}`} cx={x(p.at)} cy={y(p.value)} r={3} className="fill-tone-news" fillOpacity={0.35} />
            ))}
            {comments.map((c, i) => (
              <circle key={`c${i}`} cx={x(c.at)} cy={y(c.value)} r={3} className="fill-tone-comments" fillOpacity={0.45} />
            ))}

            {newsLine.length > 1 ? <path d={line(newsLine)} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-tone-news" /> : null}
            {commentLine.length > 1 ? (
              <path d={line(commentLine)} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-tone-comments" />
            ) : null}

            {/* The dot under the pointer, whole and ringed in the panel's colour. */}
            {hot ? (
              <circle
                cx={x(hot.at)}
                cy={y(hot.value)}
                r={4.5}
                strokeWidth={2}
                className={`stroke-panel ${hot.kind === 'pin' ? 'fill-tone-news' : 'fill-tone-comments'}`}
                pointerEvents="none"
              />
            ) : null}
          </svg>
        ) : null}

        {/* The span's first and last year under the plot. */}
        {width ? (
          <div aria-hidden className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-subtle tabular-nums">
            <span>{yearOf(from)}</span>
            {yearOf(from) !== yearOf(to) ? <span>{yearOf(to)}</span> : null}
          </div>
        ) : null}

        {hot ? <Tooltip point={hot} x={x(hot.at)} y={y(hot.value)} width={width} day={dayOf(hot.at)} /> : null}
      </div>

      <p className="text-[11px] text-subtle">{t(unit === 'month' ? 'company.sentimentAverageMonth' : 'company.sentimentAverageYear')}</p>

      {/* The averages as a table, for a screen reader. */}
      <table className="sr-only">
        <caption>{t('company.sentiment')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('company.sentimentPeriod')}</th>
            {pins.length ? <th scope="col">{t('company.sentimentNews')}</th> : null}
            {comments.length ? <th scope="col">{t('company.sentimentComments')}</th> : null}
          </tr>
        </thead>
        <tbody>
          {[...new Set([...newsLine, ...commentLine].map((b) => b.at))]
            .sort((a, b) => a - b)
            .map((at) => (
              <tr key={at}>
                <th scope="row">{periodOf(at)}</th>
                {pins.length ? <td>{format(newsLine.find((b) => b.at === at))}</td> : null}
                {comments.length ? <td>{format(commentLine.find((b) => b.at === at))}</td> : null}
              </tr>
            ))}
        </tbody>
      </table>
    </figure>
  );
}

// What the info button folds out: how the scores are made, then what they
// say - the average, which way the latest pins lean, what is coming, and the
// recent pins lifting and dragging it, each a link (src/lib/companySentiment.ts).
function Explanation({ id, name, sentiment, now }: { id: string; name: string; sentiment: CompanySentiment; now: number }) {
  const t = useT();
  const explained = explainSentiment(sentiment.pins, now);
  const comments = sentiment.comments.map((c) => c.value);
  const commentMood = comments.length ? moodOf(comments.reduce((sum, v) => sum + v, 0) / comments.length) : null;
  const trendKey = { up: 'company.sentimentUp', down: 'company.sentimentDown', steady: 'company.sentimentSteady' } as const;
  const moodKey = { positive: 'comments.moodPositive', mixed: 'comments.moodMixed', negative: 'comments.moodNegative' } as const;
  return (
    <div id={id} className="flex flex-col gap-2 rounded-lg border border-line bg-raised/40 px-3 py-2.5 text-xs leading-relaxed text-muted">
      <p>{t('company.sentimentHow', { name })}</p>
      {explained ? (
        <p>
          {t('company.sentimentOverall', { count: explained.count, value: signed(explained.average) })}
          {explained.trend
            ? ` ${t(trendKey[explained.trend.direction], { recent: signed(explained.trend.recent), earlier: signed(explained.trend.earlier) })}`
            : ''}
          {explained.upcoming ? ` ${t('company.sentimentUpcoming', { count: explained.upcoming.count, value: signed(explained.upcoming.average) })}` : ''}
        </p>
      ) : null}
      {explained?.lifting.length ? <Drivers label={t('company.sentimentLifting')} pins={explained.lifting} /> : null}
      {explained?.dragging.length ? <Drivers label={t('company.sentimentDragging')} pins={explained.dragging} /> : null}
      {commentMood ? <p>{t('company.sentimentCommentsMood', { mood: t(moodKey[commentMood]) })}</p> : null}
    </div>
  );
}

function Drivers({ label, pins }: { label: string; pins: ExplainedPin[] }) {
  return (
    <div>
      <div className="font-medium text-ink">{label}</div>
      <ul className="mt-0.5 flex flex-col gap-0.5">
        {pins.map((pin) => (
          <li key={pin.id} className="flex items-baseline gap-1.5">
            <span className="shrink-0 font-medium text-ink tabular-nums">{signed(pin.value)}</span>
            <Link href={pinPath(pin)} prefetch={false} className="line-clamp-2 min-w-0">
              {pin.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const format = (bucket?: SentimentBucket) => (bucket ? `${signed(bucket.value)} (${bucket.count})` : '');

// The hovered dot: its value first and strong, then what it is. Kept inside
// the plot's width, above the dot, or below it when the dot is near the top.
function Tooltip({ point, x, y, width, day }: { point: Plotted; x: number; y: number; width: number; day: string }) {
  const t = useT();
  const box = 184;
  const left = Math.min(Math.max(0, x - box / 2), Math.max(0, width - box));
  const above = y > 44;
  const body = (
    <>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className={`h-0.5 w-3 shrink-0 rounded-full ${point.kind === 'pin' ? 'bg-tone-news' : 'bg-tone-comments'}`} />
        <span className="font-semibold text-ink tabular-nums">{signed(point.value)}</span>
        <span className="text-subtle">{day}</span>
      </span>
      <span className="mt-0.5 line-clamp-2 text-muted">{point.kind === 'pin' ? point.title : t('company.sentimentComment')}</span>
    </>
  );
  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs shadow-lg shadow-shade/40"
      style={{ left, width: box, ...(above ? { bottom: HEIGHT + 16 - y + 10 } : { top: y + 10 }) }}
    >
      {body}
    </div>
  );
}
