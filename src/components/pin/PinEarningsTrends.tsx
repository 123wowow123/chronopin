'use client';

import Anchor from '@/components/ui/Anchor';
import { useEffect, useMemo, useState } from 'react';
import { RefineLink } from '@/components/pin/RefineLink';
import { api } from '@/lib/client/api';
import { useIntlLocale, useT } from '@/lib/client/i18n';
import { margin, niceStep, verdict, type EarningsTrends, type EpsQuarter, type RevenuePeriod } from '@/lib/earningsTrends';
import type { Translator } from '@/lib/i18n/translate';

// "Earnings Trends" on an earnings pin: EPS against the analysts' estimate, and
// revenue against earnings with the profit margin, the two widgets Yahoo
// Finance shows on a quote page. Fetched in the browser (the page is cached for
// hours); nothing renders when Nasdaq has no figures for the ticker.
//
// Colour is semantic, not categorical: a beat is the success token, a miss the
// danger token; revenue wears the link token, earnings the warning token and the
// margin line the success token. Every figure is also text, in the header line
// and under each column, so no value rests on colour alone.

const W = 440;
const H = 220;
const PAD = { top: 14, right: 44, bottom: 54, left: 66 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function useFormats(currency?: string) {
  const loc = useIntlLocale();
  return useMemo(
    () => ({
      compact: new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1, ...(currency ? { style: 'currency', currency } : {}) }),
      pct: new Intl.NumberFormat(loc, { maximumFractionDigits: 2, minimumFractionDigits: 2 }),
      pct0: new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }),
      eps: new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      signed: new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }),
      day: new Intl.DateTimeFormat(loc, { month: 'short', day: '2-digit', timeZone: 'UTC' }),
    }),
    [loc, currency],
  );
}

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; text: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-line ring-inset">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1 text-xs font-medium ${o.id === value ? 'bg-accent/25 text-link' : 'text-muted hover:bg-raised hover:text-ink'}`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

const PILL = 'inline-flex items-center rounded-full border border-line bg-field px-3 py-1 font-semibold text-ink transition-colors hover:bg-raised hover:text-link hover:no-underline';

// A heading that is also a search: the pill finds the pins sharing the term.
function HeadingPill({ field, value, title, className = 'text-base', children }: { field: 'tag' | 'ticker' | 'company'; value: string; title: string; className?: string; children: React.ReactNode }) {
  return (
    <RefineLink field={field} value={value} title={title} className={`${PILL} ${className}`}>
      {children}
    </RefineLink>
  );
}

function Card({ title, aside, children }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="surface min-w-0 rounded-xl border border-line bg-raised/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

// Yahoo's layout: the last four reported quarters, then the next one still to come.
function shownEps(all: EpsQuarter[]): EpsQuarter[] {
  const reported = all.filter((q) => q.actual != null).slice(-4);
  const next = all.find((q) => q.actual == null && q.end > (reported[reported.length - 1]?.end ?? ''));
  return next ? [...reported, next] : reported;
}

// What a card heading searches: the ticker's pins, or the company's when it has no ticker.
type Find = { field: 'ticker' | 'company'; value: string; title: string };

function EpsCard({ quarters, find, t }: { quarters: EpsQuarter[]; find: Find; t: Translator }) {
  const f = useFormats();
  const shown = useMemo(() => shownEps(quarters), [quarters]);
  const [hover, setHover] = useState<number | null>(null);
  const lastReported = shown.reduce((a, q, i) => (q.actual != null ? i : a), -1);
  const active = hover ?? (lastReported >= 0 ? lastReported : shown.length - 1);
  const values = shown.flatMap((q) => [q.actual, q.estimate]).filter((v): v is number => v != null);
  if (!shown.length || !values.length) return null;
  const step = niceStep(Math.max(Math.max(...values) - Math.min(...values), 0.04), 3);
  const lo = Math.floor(Math.min(...values, 0) / step) * step;
  const hi = Math.max(Math.ceil(Math.max(...values, 0) / step) * step, lo + step);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * PH;
  const x = (i: number) => PAD.left + ((i + 0.5) / shown.length) * PW;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  const a = shown[active];
  const r = verdict(a);
  const verdictText = (q: EpsQuarter) => {
    const v = verdict(q);
    return v ? t(`earningsTrends.${v.verdict}`) : '';
  };
  const summary = shown.map((q) => `${q.label}: ${q.estimate != null ? `${t('earningsTrends.estimate')} ${f.eps.format(q.estimate)}` : ''} ${q.actual != null ? `${t('earningsTrends.actual')} ${f.eps.format(q.actual)}` : ''}`.trim()).join('; ');
  return (
    <Card title={<HeadingPill field={find.field} value={find.value} title={find.title}>{t('earningsTrends.eps')}</HeadingPill>}>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-ink">{a.label}</span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span aria-hidden className="inline-block size-2.5 rounded-full ring-2 ring-subtle ring-inset" />
          {t('earningsTrends.estimate')} <span className="text-ink tabular-nums">{a.estimate != null ? f.eps.format(a.estimate) : '--'}</span>
        </span>
        {a.actual != null ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span aria-hidden className={`inline-block size-2.5 rounded-full ${r?.verdict === 'miss' ? 'bg-danger' : 'bg-success'}`} />
            {t('earningsTrends.actual')} <span className={`tabular-nums ${r?.verdict === 'miss' ? 'text-danger' : 'text-success'}`}>{f.signed.format(a.actual)}</span>
          </span>
        ) : null}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label={`${t('earningsTrends.eps')}. ${summary}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-line" strokeDasharray={v === 0 ? undefined : '3 4'} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="fill-muted" fontSize={11}>
              {f.eps.format(v)}
            </text>
          </g>
        ))}
        {shown.map((q, i) => {
          const v = verdict(q);
          const bad = v?.verdict === 'miss';
          return (
            <g key={q.end} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${q.label} ${verdictText(q)}`} className="outline-none">
              <rect x={x(i) - PW / shown.length / 2} y={PAD.top} width={PW / shown.length} height={PH + PAD.bottom} fill="transparent" />
              {i === active ? <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={PAD.top + PH} className="stroke-subtle" strokeDasharray="3 3" /> : null}
              {q.estimate != null ? <circle cx={x(i)} cy={y(q.estimate)} r={9} fill="none" className="stroke-subtle" strokeWidth={2} /> : null}
              {q.actual != null ? <circle cx={x(i)} cy={y(q.actual)} r={8} className={bad ? 'fill-danger' : 'fill-success'} /> : null}
              <text x={x(i)} y={PAD.top + PH + 18} textAnchor="middle" className="fill-ink" fontSize={11}>
                {q.label}
              </text>
              {v ? (
                <>
                  <text x={x(i)} y={PAD.top + PH + 32} textAnchor="middle" className={bad ? 'fill-danger' : 'fill-success'} fontSize={11} fontWeight={600}>
                    {verdictText(q)}
                  </text>
                  <text x={x(i)} y={PAD.top + PH + 45} textAnchor="middle" className={bad ? 'fill-danger' : 'fill-success'} fontSize={11}>
                    {f.signed.format(v.diff)}
                  </text>
                </>
              ) : q.actual == null ? (
                <text x={x(i)} y={PAD.top + PH + 36} textAnchor="middle" className="fill-ink" fontSize={11}>
                  {t('earningsTrends.upcoming')}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

function RevenueCard({ quarterly, annual, currency, find, t }: { quarterly: RevenuePeriod[]; annual: RevenuePeriod[]; currency?: string; find: Find; t: Translator }) {
  const f = useFormats(currency);
  const [mode, setMode] = useState<'annual' | 'quarterly'>(quarterly.length ? 'quarterly' : 'annual');
  const [hover, setHover] = useState<number | null>(null);
  const periods = mode === 'quarterly' ? quarterly : annual;
  if (!periods.length) return null;
  const active = hover ?? periods.length - 1;
  const p = periods[Math.min(active, periods.length - 1)];
  const bars = periods.flatMap((q) => [q.revenue, q.earnings ?? 0]);
  const rawTop = Math.max(...bars, 0);
  const rawBottom = Math.min(...bars, 0);
  const step = niceStep(Math.max(rawTop - rawBottom, 1), 3);
  const lo = Math.floor(rawBottom / step) * step;
  const hi = Math.ceil(rawTop / step) * step;
  const margins = periods.map(margin);
  const mVals = margins.filter((m): m is number => m != null);
  const mStep = niceStep(Math.max(Math.max(...mVals, 0) - Math.min(...mVals, 0), 10), 3);
  const mLo = Math.floor(Math.min(...mVals, 0) / mStep) * mStep;
  const mHi = Math.max(Math.ceil(Math.max(...mVals, 0) / mStep) * mStep, mLo + mStep);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * PH;
  const ym = (v: number) => PAD.top + (1 - (v - mLo) / (mHi - mLo)) * PH;
  const slot = PW / periods.length;
  const cx = (i: number) => PAD.left + (i + 0.5) * slot;
  const bw = Math.min(slot * 0.3, 30);
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  const mTicks: number[] = [];
  for (let v = mLo; v <= mHi + mStep / 2; v += mStep) mTicks.push(Math.round(v * 100) / 100);
  const line = periods.flatMap((_, i) => (margins[i] == null ? [] : [`${cx(i)},${ym(margins[i]!)}`])).join(' ');
  const pm = margin(p);
  const summary = periods.map((q) => `${q.label}: ${t('earningsTrends.revenue')} ${f.compact.format(q.revenue)}${q.earnings != null ? `, ${t('earningsTrends.earnings')} ${f.compact.format(q.earnings)}` : ''}`).join('; ');
  return (
    <Card
      title={<HeadingPill field={find.field} value={find.value} title={find.title}>{t('earningsTrends.revenueVsEarnings')}</HeadingPill>}
      aside={
        quarterly.length && annual.length ? (
        <Toggle
          value={mode}
          label={t('earningsTrends.revenueVsEarnings')}
          onChange={(m) => {
            setMode(m);
            setHover(null);
          }}
          options={[
            { id: 'annual', text: t('earningsTrends.annual') },
            { id: 'quarterly', text: t('earningsTrends.quarterly') },
          ]}
        />
        ) : null
      }
    >
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-ink">{p.label}</span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span aria-hidden className="inline-block size-2.5 rounded-sm bg-link" />
          {t('earningsTrends.revenue')} <span className="text-ink tabular-nums">{f.compact.format(p.revenue)}</span>
        </span>
        {p.earnings != null ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span aria-hidden className="inline-block size-2.5 rounded-sm bg-warning" />
            {t('earningsTrends.earnings')} <span className="text-ink tabular-nums">{f.compact.format(p.earnings)}</span>
          </span>
        ) : null}
        {pm != null ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span aria-hidden className="inline-block h-0.5 w-3 bg-success" />
            {t('earningsTrends.profitMargin')} <span className="text-ink tabular-nums">{f.pct.format(pm)}%</span>
          </span>
        ) : null}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label={`${t('earningsTrends.revenueVsEarnings')}. ${summary}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-line" strokeDasharray={v === 0 ? undefined : '3 4'} strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="fill-muted" fontSize={11}>
              {v === 0 ? '0' : f.compact.format(v)}
            </text>
          </g>
        ))}
        {mTicks.map((v) => (
          <text key={v} x={W - PAD.right + 8} y={ym(v) + 4} className="fill-muted" fontSize={11}>
            {f.pct0.format(v)}%
          </text>
        ))}
        {periods.map((q, i) => (
          <g key={q.end} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={q.label} className="outline-none">
            <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={PH + PAD.bottom} fill="transparent" />
            <rect x={cx(i) - bw - 2} y={y(q.revenue)} width={bw} height={Math.max(y(0) - y(q.revenue), 1)} rx={3} className={i === active ? 'fill-link' : 'fill-link/70'} />
            {q.earnings != null ? (
              <rect x={cx(i) + 2} y={Math.min(y(0), y(q.earnings))} width={bw} height={Math.max(Math.abs(y(q.earnings) - y(0)), 1)} rx={3} className={i === active ? 'fill-warning' : 'fill-warning/70'} />
            ) : null}
            <text x={cx(i)} y={PAD.top + PH + 20} textAnchor="middle" className="fill-ink" fontSize={11}>
              {q.label}
            </text>
          </g>
        ))}
        {line.includes(' ') ? <polyline points={line} fill="none" className="stroke-success" strokeWidth={2.5} strokeLinejoin="round" /> : null}
        {periods.map((q, i) => (margins[i] == null ? null : <circle key={q.end} cx={cx(i)} cy={ym(margins[i]!)} r={3.5} className="fill-panel stroke-success" strokeWidth={2} />))}
      </svg>
    </Card>
  );
}

export function PinEarningsTrends({ pinId, symbol }: { pinId: number; symbol?: string }) {
  const [trends, setTrends] = useState<EarningsTrends | null>(null);
  const t = useT();
  useEffect(() => {
    let live = true;
    api
      .get<{ trends: EarningsTrends | null }>(`/api/pins/${pinId}/earnings-trends`)
      .then((r) => live && setTrends(r.trends))
      .catch(() => live && setTrends(null));
    return () => {
      live = false;
    };
  }, [pinId]);
  if (!trends) return null;
  const ticker = symbol ?? trends.symbol;
  const company = trends.company;
  const find: Find | null = ticker
    ? { field: 'ticker', value: ticker, title: t('stocks.searchPins', { symbol: ticker }) }
    : company
      ? { field: 'company', value: company, title: t('card.showAllValue', { value: company }) }
      : null;
  if (!find) return null;
  return (
    <section aria-labelledby="earnings-trends-heading" className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="earnings-trends-heading">
          <HeadingPill field="tag" value="Earnings" title={t('pin.showTagged', { name: 'Earnings' })} className="text-lg">
            {t('earningsTrends.heading')}
          </HeadingPill>
        </h2>
        {ticker ? (
          <Anchor href={`https://finance.yahoo.com/quote/${encodeURIComponent(ticker.replace('.', '-'))}/financials/`} target="_blank" rel="noopener nofollow" className="text-xs text-subtle hover:text-link hover:no-underline">
            {t('stocks.onYahoo', { symbol: ticker })}
          </Anchor>
        ) : null}
      </div>
      <div className="grid gap-4">
        <EpsCard quarters={trends.eps} find={find} t={t} />
        <RevenueCard quarterly={trends.quarterly} annual={trends.annual} currency={trends.currency} find={find} t={t} />
      </div>
      <p className="mt-1 text-xs text-subtle">{trends.source ? t('earningsTrends.sourceAnnual', { currency: trends.currency ?? '' }) : t('earningsTrends.source')}</p>
    </section>
  );
}
