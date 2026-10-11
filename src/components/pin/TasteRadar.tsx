'use client';

import { useId, useState, type ReactNode } from 'react';
import { useLocale, useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { localizePath, splitLocale } from '@/lib/i18n/config';
import { TASTE_AXES, TASTE_MAX, type TasteAxis, type TasteScores } from '@/lib/pinTaste';
import { refineQuery, term } from '@/lib/searchTerms';

// The radar's geometry. Axis 0 points straight up and the rest follow
// clockwise, so the seven read Aroma, Bitterness, Sweetness, Astringency,
// Umami, Pungent and Coolness round the heptagon.
const W = 400;
const H = 292;
const CX = W / 2;
const CY = 140;
const R = 98;
const LABEL_R = R + 22;

const point = (index: number, radius: number): [number, number] => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / TASTE_AXES.length;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
};
// Heat runs from cool blue at the centre (a score of 0) through amber to red at
// the outer ring (5), so a stronger taste reads hotter.
const HEAT = [
  { at: 0, color: [59, 130, 246] },
  { at: 0.5, color: [251, 191, 36] },
  { at: 1, color: [239, 68, 68] },
] as const;
const heatColor = (share: number): string => {
  const x = Math.min(1, Math.max(0, share));
  const hi = Math.max(1, HEAT.findIndex((stop) => stop.at >= x));
  const [a, b] = [HEAT[hi - 1], HEAT[hi]];
  const f = (x - a.at) / (b.at - a.at);
  return `rgb(${a.color.map((c, i) => Math.round(c + (b.color[i] - c) * f)).join(',')})`;
};
const heatStops = HEAT.map((stop) => ({ offset: `${stop.at * 100}%`, color: `rgb(${stop.color.join(',')})` }));

const polygon = (radius: (index: number) => number) =>
  TASTE_AXES.map((_, i) => point(i, radius(i)).map((n) => n.toFixed(1)).join(',')).join(' ');

// The radar of a taste profile (PinTaste, 0157, 0160). A vertex shows a
// dot, and its score in the corner of the card, only while it is hovered,
// clicked, tapped or focused (a touch screen has no hover). An axis's label
// is a link: it searches for the products that score that axis strongly
// (taste:bitterness), added to the search already showing on the search page.
export function TasteRadar({
  scores,
  labels,
  summary,
  showJa,
  abv,
}: {
  scores: TasteScores;
  labels: Record<TasteAxis, string>;
  summary: string;
  showJa: boolean;
  // A drink's alcohol by volume, always shown at the card's top left.
  abv: { label: string; value: string; cite: ReactNode } | null;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const active = hovered ?? focused;
  // Hover and click for one axis, wherever it is drawn: vertex, spoke or label.
  const bind = (i: number) => ({
    onMouseEnter: () => setHovered(i),
    onMouseLeave: () => setHovered(null),
    onClick: () => setFocused(i),
  });
  // Unique per chart, and free of the colons useId prints, which url(#...) dislikes.
  const uid = useId().replace(/:/g, '');
  const fieldId = `${uid}-field`;
  const heatId = `${uid}-heat`;
  return (
    <div className="relative">
      {abv ? (
        <span className="absolute top-0 left-0 z-10 flex flex-col items-start leading-tight select-text [direction:ltr]">
          <span className="text-xs text-muted">{abv.label}</span>
          {/* A bold serif figure, like "21%" on a spirit's label. */}
          <span className="font-serif text-xl font-bold text-ink tabular-nums">
            {abv.value}
            <span className="text-xs font-normal text-muted">{abv.cite}</span>
          </span>
        </span>
      ) : null}
      {/* The score as a fraction with its axis name under it, top right of
          the card, not moving anything else. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 right-0 flex flex-col items-end leading-tight transition-opacity ${active == null ? 'opacity-0' : 'opacity-100'}`}
      >
        <span className="text-xl font-semibold text-ink tabular-nums">
          {active == null ? '' : scores[TASTE_AXES[active].key]}
          <span className="text-xs font-normal text-muted">/{TASTE_MAX}</span>
        </span>
        <span className="text-xs text-muted">{active == null ? '' : labels[TASTE_AXES[active].key]}</span>
      </span>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        className="mx-auto block w-full max-w-sm [direction:ltr]"
        onClick={(event) => {
          if (event.target === event.currentTarget) setFocused(null);
        }}
      >
        <defs>
          {/* The field behind the shape: cool at the top, warm at the bottom. */}
          <linearGradient id={fieldId} gradientUnits="userSpaceOnUse" x1={0} y1={CY - R} x2={0} y2={CY + R * Math.cos(Math.PI / TASTE_AXES.length)}>
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
            <stop offset="50%" stopColor="#c4b5fd" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.32} />
          </linearGradient>
          {/* The score shape: heat by distance from the centre. */}
          <radialGradient id={heatId} gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={R}>
            {heatStops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={0.6} />
            ))}
          </radialGradient>
        </defs>
        <polygon points={polygon(() => R)} fill={`url(#${fieldId})`} stroke="none" />
        {Array.from({ length: TASTE_MAX }, (_, ring) => (
          <polygon key={ring} points={polygon(() => (R * (ring + 1)) / TASTE_MAX)} fill="none" className="stroke-raised-2" strokeWidth={ring === TASTE_MAX - 1 ? 2 : 1} />
        ))}
        {TASTE_AXES.map((axis, i) => {
          const [x, y] = point(i, R);
          return <line key={axis.key} x1={CX} y1={CY} x2={x} y2={y} className="stroke-raised-2" strokeWidth={1} />;
        })}
        <polygon points={polygon((i) => (R * scores[TASTE_AXES[i].key]) / TASTE_MAX)} fill={`url(#${heatId})`} stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" />
        {/* The whole spoke is a hover target, drawn under the vertices: a score
            of 0 puts a vertex on the centre, where several share one point and
            the last drawn would win, so each axis stays reachable along its
            spoke and by its label. */}
        {TASTE_AXES.map((axis, i) => {
          const [x, y] = point(i, LABEL_R - 6);
          const [hx, hy] = point(i, R);
          return (
            <g key={axis.key} className="cursor-default" {...bind(i)}>
              <line x1={CX} y1={CY} x2={hx} y2={hy} stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" className={`pointer-events-none transition-opacity ${active === i ? 'opacity-70' : 'opacity-0'}`} />
              <line x1={CX} y1={CY} x2={x} y2={y} stroke="transparent" strokeWidth={22} strokeLinecap="round" />
            </g>
          );
        })}
        {TASTE_AXES.map((axis, i) => {
          const [x, y] = point(i, (R * scores[axis.key]) / TASTE_MAX);
          return (
            <g
              key={axis.key}
              tabIndex={0}
              className="cursor-default outline-none"
              {...bind(i)}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused((current) => (current === i ? null : current))}
            >
              <circle cx={x} cy={y} r={14} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={4.5}
                fill={heatColor(scores[axis.key] / TASTE_MAX)}
                className={`origin-center stroke-panel transition [transform-box:fill-box] ${active === i ? 'scale-125 opacity-100' : 'opacity-0'}`}
                strokeWidth={1.5}
              />
            </g>
          );
        })}
        {TASTE_AXES.map((axis, i) => {
          const [x, y] = point(i, LABEL_R);
          const anchor = Math.abs(x - CX) < 4 ? 'middle' : x > CX ? 'start' : 'end';
          // Top label sits above its point, bottom ones below, sides centred.
          const dy = y < CY - R / 2 ? -6 : y > CY + R / 2 ? 14 : 0;
          const href = `/search?q=${encodeURIComponent(term('taste', axis.key))}`;
          return (
            <a
              key={axis.key}
              href={localizePath(href, locale)}
              aria-label={t('card.showAllValue', { value: labels[axis.key] })}
              className="cursor-pointer"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                if (splitLocale(window.location.pathname).path !== '/search') {
                  router.push(href);
                  return;
                }
                const current = new URLSearchParams(window.location.search);
                current.set('q', refineQuery(current.get('q') || '', 'taste', axis.key));
                router.push(`/search?${current.toString()}`);
              }}
            >
              <text x={x} y={y + dy} textAnchor={anchor} className="fill-ink text-[13px] hover:underline" {...bind(i)}>
                <tspan x={x} dy={0}>{labels[axis.key]}</tspan>
                {showJa ? (
                  <tspan x={x} dy={16} className="fill-muted text-[12px]" lang="ja">
                    {axis.ja}
                  </tspan>
                ) : null}
              </text>
            </a>
          );
        })}
      </svg>
    </div>
  );
}
