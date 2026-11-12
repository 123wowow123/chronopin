import { RATIO_LINES, RATIO_MIN, RATIO_TOP, type MapPoint, type Unplaced } from '@/lib/holdingsMap';
import type { Translator } from '@/lib/i18n/translate';

const W = 640;
const H = 400;
const PAD = { l: 52, r: 20, t: 16, b: 34 };
const R_MIN = 7;
const R_MAX = 26;

// The All-Map of one portfolio, drawn as plain SVG so it renders on the server:
// weight across, last close over the 52-week high up the log axis, bubble size
// by weight. Long positions in the accent colour, shorts in the danger colour.
export function HoldingsMap({ points, unplaced, t }: { points: MapPoint[]; unplaced: Unplaced[]; t: Translator }) {
  const maxWeight = Math.max(...points.map(p => p.weight), 1) * 1.15;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (weight: number) => PAD.l + (weight / maxWeight) * plotW;
  // Log axis from RATIO_MIN up to a little over 1 (the 52-week high), so a
  // bubble at the high is not cut by the top edge.
  const top = Math.log(RATIO_TOP);
  const y = (ratio: number) => PAD.t + (top - Math.log(Math.max(ratio, RATIO_MIN))) / (top - Math.log(RATIO_MIN)) * plotH;
  const radius = (weight: number) => R_MIN + (R_MAX - R_MIN) * Math.sqrt(weight / maxWeight);
  const percent = (v: number) => `${Math.round(v * 100)}%`;
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round(maxWeight / 5 * (i + 1)));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('person.holdings.mapTitle')} className="h-auto w-full">
        <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} className="fill-raised" />
        {RATIO_LINES.map(line => (
          <g key={line}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(line)} y2={y(line)} className="stroke-line" strokeDasharray="4 4" />
            <text x={PAD.l - 6} y={y(line) + 3} textAnchor="end" className="fill-subtle text-[10px]">{percent(line)}</text>
          </g>
        ))}
        <text x={PAD.l - 6} y={y(1) + 3} textAnchor="end" className="fill-subtle text-[10px]">100%</text>
        {ticks.map(tick => (
          <text key={tick} x={x(tick)} y={H - PAD.b + 14} textAnchor="middle" className="fill-subtle text-[10px]">{tick}%</text>
        ))}
        <text x={PAD.l + plotW / 2} y={H - 4} textAnchor="middle" className="fill-muted text-[11px]">{t('person.holdings.mapX')}</text>
        <text transform={`translate(11 ${PAD.t + plotH / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted text-[11px]">{t('person.holdings.mapY')}</text>
        {points.map(p => {
          const r = radius(p.weight);
          return (
            <g key={`${p.symbol}:${p.side}`}>
              <title>{`${p.symbol} · ${p.name} · ${p.weight}% · ${percent(p.ratio)}`}</title>
              <circle cx={x(p.weight)} cy={y(p.ratio)} r={r} className={p.side === 'short' ? 'fill-danger/40 stroke-danger' : 'fill-accent/40 stroke-accent'} strokeWidth={1.5} />
              <text x={x(p.weight)} y={y(p.ratio) + (r + 11)} textAnchor="middle" className="fill-ink text-[10px] font-semibold">{p.symbol}</text>
            </g>
          );
        })}
      </svg>
      <details className="group mt-3 rounded-lg border border-line bg-raised p-3 text-xs leading-relaxed text-muted">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span>{t('person.holdings.iv15LegendTitle')}</span>
          <span aria-hidden className="text-subtle transition-transform group-open:rotate-180">▼</span>
        </summary>
        <ul className="mt-2 list-disc space-y-1 ps-4">
          <li>{t('person.holdings.mapReadX')}</li>
          <li>{t('person.holdings.mapReadY')}</li>
          <li>{t('person.holdings.mapReadSize')}</li>
          <li>{t('person.holdings.mapReadNote')}</li>
        </ul>
      </details>
      {unplaced.length ? (
        <p className="mt-2 text-xs leading-relaxed text-subtle">
          {t('person.holdings.mapNotPlaced')}: {unplaced.map(u => `${u.symbol} (${t(`person.holdings.mapReason.${u.reason}`)})`).join(', ')}
        </p>
      ) : null}
    </div>
  );
}
