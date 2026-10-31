import type { Translator } from '@/lib/i18n/translate';
import { capacitySeries, type FactoryCapacityPoint } from '@/lib/pinFactory';
import { FactorySource } from './FactorySource';

const W = 600;
const H = 190;
const PAD = { l: 44, r: 14, t: 12, b: 26 };

const YEAR = 365.25 * 24 * 3600 * 1000;
const fmtMw = (mw: number) => (mw >= 1000 ? `${(mw / 1000).toFixed(mw % 1000 ? 2 : 0).replace(/\.?0+$/, '')} GW` : `${Math.round(mw).toLocaleString('en-US')} MW`);
const yearOf = (at: number) => new Date(at).getUTCFullYear();

// A round top for the y axis so the gridlines land on tidy values.
function niceMax(max: number): number {
  const mag = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * mag >= max) return step * mag;
  return max;
}

// The sourced capacity readings and targets for one campus as a step line over time: a filled dot is something observed or
// reported as done, a hollow dot a planned target, and the line turns dashed where it runs into the plan. A static SVG
// (no script) with the same numbers repeated in a list underneath, each with its source.
export function PinCapacityChart({ points: given, t, className = '' }: { points: FactoryCapacityPoint[] | undefined; t: Translator; className?: string }) {
  const points = capacitySeries(given);
  if (points.length < 2) return null;
  const first = points[0].at;
  const last = points[points.length - 1].at;
  const span = Math.max(last - first, YEAR / 12);
  const top = niceMax(Math.max(...points.map((p) => p.mw)));
  const x = (at: number) => PAD.l + ((at - first) / span) * (W - PAD.l - PAD.r);
  const y = (mw: number) => PAD.t + (1 - mw / top) * (H - PAD.t - PAD.b);
  const grid = [0, 0.5, 1].map((f) => f * top);
  // Years between the first and last reading that fall inside the plot, thinned to at most six labels.
  const years: number[] = [];
  for (let yr = yearOf(first) + 1; Date.UTC(yr, 0, 1) < last; yr++) years.push(yr);
  const stride = Math.ceil(years.length / 5) || 1;
  // Step line: hold the previous value until the next reading's date, then step up/down.
  const segments = points.slice(1).map((p, i) => {
    const prev = points[i];
    const planned = p.basis === 'planned';
    return { d: `M${x(prev.at)},${y(prev.mw)} H${x(p.at)} V${y(p.mw)}`, planned, key: i };
  });
  return (
    <div className={className}>
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('pin.factory.capacityHeading')}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label={`${t('pin.factory.capacityHeading')}: ${points.map((p) => `${p.date} ${fmtMw(p.mw)}`).join(', ')}`}>
        {grid.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-raised-2" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" className="fill-muted" fontSize={10}>{v === 0 ? '0' : fmtMw(v)}</text>
          </g>
        ))}
        {years.filter((_, i) => i % stride === 0).map((yr) => (
          <text key={yr} x={x(Date.UTC(yr, 0, 1))} y={H - 8} textAnchor="middle" className="fill-muted" fontSize={10}>{yr}</text>
        ))}
        {segments.map((s) => (
          <path key={s.key} d={s.d} fill="none" className="stroke-link" strokeWidth={2} strokeLinejoin="round" strokeDasharray={s.planned ? '5 4' : undefined} />
        ))}
        {points.map((p, i) => (
          <circle key={i} cx={x(p.at)} cy={y(p.mw)} r={4.5} strokeWidth={2} className={`stroke-link ${p.basis === 'demonstrated' ? 'fill-link' : 'fill-raised'}`}>
            <title>{`${p.date}: ${fmtMw(p.mw)} (${t(`pin.factory.${p.basis}`)}) ${p.label}`}</title>
          </circle>
        ))}
      </svg>
      <ol className="mt-2 space-y-1.5 text-xs">
        {points.map((p, i) => (
          <li key={i} className="rounded-md bg-raised/60 px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span><span className="font-semibold tabular-nums">{p.date}</span> · {p.label}</span>
              <span className="font-semibold tabular-nums">{fmtMw(p.mw)}</span>
            </div>
            <details className="mt-1">
              <summary className="cursor-pointer text-link">{t('pin.factory.source')}</summary>
              <FactorySource source={p.source} />
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
