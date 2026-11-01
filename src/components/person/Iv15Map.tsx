import Anchor from '@/components/ui/Anchor';
import { C_IV15 } from '@/lib/hurdlePrice';
import { AXIS_MAX, AXIS_MIN, RETURN_LINES, TIERS, TIER_COLORS, UNRATED, impliedReturn, ratioForReturn, ratioSpan, type Iv15Point } from '@/lib/iv15Map';
import type { Translator } from '@/lib/i18n/translate';

// The legend's one-line description of each column.
const TIER_TEXT = { Fortress: 'person.holdings.iv15TierFortress', Castle: 'person.holdings.iv15TierCastle', Chapel: 'person.holdings.iv15TierChapel', Stone: 'person.holdings.iv15TierStone', Wood: 'person.holdings.iv15TierWood', Unrated: 'person.holdings.iv15TierUnrated' } as const;

const LEGEND_TIERS = [...TIERS, UNRATED] as const;

// Published dots and their legend swatches: one colour (blue), since the column carries the tier.
const PUBLISHED = '#3b82f6';
const W = 640;
const H = 400;
const PAD = { l: 52, r: 74, t: 14, b: 34 };

// The All-Map as its analyst published it: tier across (Fortress to Wood),
// P/IV15 up a log scale, bubble size set by the composite score, with the
// return each height implies drawn as dashed lines. A held position is solid,
// a covered one is faint; a range of IV15 draws as a bar. Plain SVG, so it
// renders on the server.
export function Iv15Map({ points, name, t }: { points: Iv15Point[]; name: string; t: Translator }) {
  const published = points.filter(p => !p.estimate);
  const estimates = points.filter(p => p.estimate);
  // The five tier columns, plus Unrated when a stock had too little data to be placed in one.
  const lanes: string[] = points.some(p => p.tier === UNRATED) ? [...TIERS, UNRATED] : [...TIERS];
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const lane = plotW / lanes.length;
  const lo = Math.log(AXIS_MIN);
  const hi = Math.log(AXIS_MAX);
  const y = (ratio: number) => PAD.t + (hi - Math.log(Math.min(Math.max(ratio, AXIS_MIN), AXIS_MAX))) / (hi - lo) * plotH;
  const placed = points.flatMap(p => { const span = ratioSpan(p); return span ? [{ p, span }] : []; });
  const radius = (score: number | null) => 6 + 14 * Math.sqrt((score ?? 30) / 100);
  const ticks = [0.5, 1, 2, 3, 5];
  // Within a tier, left to right by composite score; no score sits in the middle.
  const xOf = (p: Iv15Point): number => {
    // An estimate for a rated stock is placed just beside the published bubble.
    const twin = p.estimate ? points.find(q => !q.estimate && q.symbol === p.symbol) : undefined;
    if (twin) return Math.min(xOf(twin) + radius(twin.score) + radius(null) - 2, PAD.l + (lanes.indexOf(twin.tier) + 1) * lane - radius(null) - 1);
    const i = lanes.indexOf(p.tier);
    const mates = placed.filter(m => m.p.tier === p.tier && !(m.p.estimate && points.some(q => !q.estimate && q.symbol === m.p.symbol))).sort((a, b) => (a.p.score ?? 50) - (b.p.score ?? 50));
    const slot = mates.findIndex(m => m.p === p) + 1;
    return PAD.l + i * lane + (slot / (mates.length + 1)) * lane;
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('person.holdings.iv15Title')} className="h-auto w-full">
        {lanes.map((tier, i) => (
          <g key={tier}>
            <rect x={PAD.l + i * lane} y={PAD.t} width={lane} height={plotH} fill={TIER_COLORS[tier as keyof typeof TIER_COLORS]} fillOpacity={i % 2 ? 0.05 : 0.09} />
            <text x={PAD.l + i * lane + lane / 2} y={H - 12} textAnchor="middle" className="text-[11px] font-semibold" fill={TIER_COLORS[tier as keyof typeof TIER_COLORS]}>{tier.toUpperCase()}</text>
          </g>
        ))}
        {ticks.map(tick => (
          <text key={tick} x={PAD.l - 6} y={y(tick) + 3} textAnchor="end" className="fill-subtle text-[10px]">{tick}×</text>
        ))}
        {RETURN_LINES.map(rate => {
          const ratio = ratioForReturn(rate);
          if (ratio < AXIS_MIN || ratio > AXIS_MAX) return null;
          return (
            <g key={rate}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(ratio)} y2={y(ratio)} className="stroke-line" strokeDasharray="4 4" />
              <text x={W - PAD.r + 4} y={y(ratio) + 3} className="fill-muted text-[10px]">{t('person.holdings.iv15Return', { rate: Math.round(rate * 100) })}</text>
            </g>
          );
        })}
        <text transform={`translate(11 ${PAD.t + plotH / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted text-[11px]">P / IV15</text>
        {placed.map(({ p, span }) => {
          const cx = xOf(p);
          const r = radius(p.score);
          const mid = Math.sqrt(span.low * span.high);
          // A dot's tier is shown by its column; only C-IV15 estimates get their own colour.
          const color = p.estimate ? TIER_COLORS.Unrated : PUBLISHED;
          const twinned = !!p.estimate && points.some(q => !q.estimate && q.symbol === p.symbol);
          return (
            <g key={`${p.symbol}:${p.estimate ? 'e' : 'p'}`} opacity={p.held ? 1 : p.estimate ? 0.8 : 0.55}>
              <title>{`${p.symbol} · ${p.name} · ${span.low === span.high ? `${span.low.toFixed(2)}×` : `${span.low.toFixed(2)}–${span.high.toFixed(2)}×`} · ${Math.round(impliedReturn(mid) * 100)}%${p.score != null ? ` · ${p.score}` : ''}${p.estimate ? ` · C-IV15${p.note ? ` (${p.note})` : ''}` : ''}`}</title>
              {span.low !== span.high ? <line x1={cx} x2={cx} y1={y(span.low)} y2={y(span.high)} stroke={color} strokeWidth={3} strokeLinecap="round" /> : null}
              <circle cx={cx} cy={y(mid)} r={r} fill={color} fillOpacity={p.held ? 0.5 : 0.2} stroke={color} strokeWidth={p.held ? 2.5 : 1.25} strokeDasharray={p.estimate ? '4 3' : undefined} />
              <text x={cx} y={y(mid) + r + 11} textAnchor="middle" className={`text-[10px] font-semibold ${twinned ? 'fill-[#8b5cf6]' : 'fill-ink'}`}>{p.symbol}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 rounded-lg border border-line bg-raised p-3 text-xs leading-relaxed text-muted">
        <p className="mb-1 font-semibold text-ink">{t('person.holdings.iv15LegendTitle')}</p>
        <p className="mb-3">{t('person.holdings.iv15LegendRatio')}</p>
        <p className="mb-1 font-semibold text-ink">{t('person.holdings.iv15LegendTiers')}</p>
        <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {LEGEND_TIERS.map(tier => (
            <div key={tier} className="contents">
              <dt className="font-semibold" style={{ color: TIER_COLORS[tier] }}>{tier.toUpperCase()}</dt>
              <dd>{t(TIER_TEXT[tier])}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-4 md:grid-cols-2">
          {published.length ? (
            <section aria-label={t('person.holdings.iv15LegendOwnerTitle', { name })}>
              <h4 className="mb-1.5 font-semibold text-ink">{t('person.holdings.iv15LegendOwnerTitle', { name })}</h4>
              <p className="mb-2">{t('person.holdings.iv15LegendOwnerAbout')}</p>
              <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
                <li className="flex items-center gap-1.5"><Swatch color={PUBLISHED} fill={0.5} width={2.5} />{t('person.holdings.iv15Held')}</li>
                <li className="flex items-center gap-1.5"><Swatch color={PUBLISHED} fill={0.2} width={1.25} />{t('person.holdings.iv15Covered')}</li>
                <li>{t('person.holdings.iv15LegendSize')}</li>
              </ul>
              <p>{t('person.holdings.iv15LegendBurry')}</p>
              <p className="mt-2 text-subtle">
                {[...new Map(published.map(p => [p.sourceUrl, p])).values()].map((p, i) => (
                  <span key={p.sourceUrl}>{i ? ', ' : ''}<Anchor href={p.sourceUrl} target="_blank" rel="noopener noreferrer">{t('person.holdings.iv15Source')} ({p.asOf}) ↗</Anchor></span>
                ))}
              </p>
            </section>
          ) : null}
          {estimates.length ? (
            <section aria-label={t('person.holdings.iv15LegendChronopinTitle')}>
              <h4 className="mb-1.5 font-semibold text-ink">{t('person.holdings.iv15LegendChronopinTitle')} <span className="font-normal text-subtle">{C_IV15.copyright}</span></h4>
              <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
                <li className="flex items-center gap-1.5"><Swatch color={TIER_COLORS.Unrated} fill={0.5} width={2.5} dashed />{t('person.holdings.iv15Held')}</li>
                <li className="flex items-center gap-1.5"><Swatch color={TIER_COLORS.Unrated} fill={0.2} width={1.5} dashed />{t('person.holdings.iv15Covered')}</li>
              </ul>
              <p className="mb-1">{t('person.holdings.iv15Estimate')}</p>
              <p>{t('person.holdings.iv15LegendChronopin')}</p>
              <p className="mt-2">{t('person.holdings.iv15LegendTierRule')}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// A legend mark: the same circle the chart draws.
function Swatch({ color, fill, width, dashed }: { color: string; fill: number; width: number; dashed?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <circle cx="8" cy="8" r="6" fill={color} fillOpacity={fill} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '3 2' : undefined} />
    </svg>
  );
}
