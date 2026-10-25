import type { Translator } from '@/lib/i18n/translate';
import { formatPerfValue, type PerfChart, type PerfTable, type PinPerfJson } from '@/lib/pinPerf';

// A hardware pin's published performance figures (PinPerf, 0198): one bar chart
// per comparison and one table per spec sheet. Server-rendered, so the figures
// are in the page's HTML for readers and crawlers alike, and each chart has its
// numbers printed on the bars (the table view of a bar chart is its labels).
//
// The bars are one kind of mark: the field is the recessive ink tone and the
// pin's own part wears the accent token, both redefined per theme in
// globals.css. Bars start at zero and scale to the longest, so lengths are
// honest. Every block names its source page.
export function PinPerf({ perf, t, locale, className = '' }: { perf: PinPerfJson; t: Translator; locale: string; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 text-sm ${className}`} aria-label={t('pin.perf.heading')}>
      {perf.charts.map((chart) => (
        <Chart key={chart.title} chart={chart} t={t} locale={locale} />
      ))}
      {perf.tables.map((table) => (
        <Table key={table.title} table={table} t={t} locale={locale} />
      ))}
    </section>
  );
}

function Source({ url, label }: { url?: string; label: string }) {
  return url ? (
    <a href={url} rel="noopener nofollow" target="_blank" className="text-link">
      {label}
    </a>
  ) : null;
}

function Chart({ chart: base, t, locale }: { chart: PerfChart; t: Translator; locale: string }) {
  const chart = { ...base, ...base.i18n?.[locale] };
  const max = Math.max(...chart.bars.map((bar) => bar.value)) || 1;
  return (
    <figure className="surface rounded-lg px-3 py-2">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">{chart.title}</span>
        <span className="text-xs text-muted">{chart.unit}</span>
      </figcaption>
      <ul className="flex flex-col gap-1.5">
        {chart.bars.map((bar) => (
          <li key={bar.label} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-xs">
            <span className={`truncate ${bar.highlight ? 'font-semibold text-foreground' : 'text-muted'}`} title={bar.label}>
              {bar.label}
            </span>
            <span className="h-3 rounded-sm bg-raised" aria-hidden>
              <span className={`block h-full rounded-sm ${bar.highlight ? 'bg-link' : 'bg-subtle/60'}`} style={{ width: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 1 : 0)}%` }} />
            </span>
            <span className={`tabular-nums ${bar.highlight ? 'font-semibold text-foreground' : 'text-muted'}`}>{formatPerfValue(bar.value, locale)}</span>
          </li>
        ))}
      </ul>
      {chart.note || chart.sourceUrl ? (
        <p className="mt-2 text-xs text-muted">
          {chart.note}
          {chart.note && chart.sourceUrl ? ' · ' : ''}
          <Source url={chart.sourceUrl} label={t('pin.perf.source')} />
        </p>
      ) : null}
    </figure>
  );
}

const TILE_DOTS = ['bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400', 'bg-rose-400', 'bg-teal-400'];

// A three-column table (measure, figure, basis) as the datacenter panel's
// telemetry tiles: the figure large, the basis beneath it.
function Tiles({ table, t }: { table: PerfTable; t: Translator }) {
  return (
    <section className="surface rounded-2xl border border-line bg-raised/40 p-4 shadow-sm" aria-label={table.title}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">{table.title}</h2>
        {table.sourceUrl ? (
          <a href={table.sourceUrl} rel="noopener nofollow" target="_blank" className="inline-flex items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-link ring-1 ring-line ring-inset hover:no-underline">
            {t('pin.perf.source')}
          </a>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {table.rows.map(([label, figure, basis], i) => (
          <li key={label} className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
              <span className={`size-2 shrink-0 rounded-full ${TILE_DOTS[i % TILE_DOTS.length]}`} aria-hidden />
              {label}
            </div>
            <div className="mt-1.5 text-lg leading-tight font-bold tracking-tight text-ink">{figure}</div>
            <div className="mt-1 text-xs text-muted">{basis}</div>
          </li>
        ))}
      </ul>
      {table.note ? <p className="mt-3 text-xs text-muted">{table.note}</p> : null}
    </section>
  );
}

function Table({ table: base, t, locale }: { table: PerfTable; t: Translator; locale: string }) {
  const table = { ...base, ...base.i18n?.[locale] };
  if (base.display === 'tiles' && table.columns.length === 3) return <Tiles table={table} t={t} />;
  return (
    <div className="surface rounded-lg px-3 py-2">
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{table.title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40 text-left text-muted">
              {table.columns.map((column, i) => (
                <th key={column} scope="col" className={`py-1 pe-2 font-semibold ${i ? 'text-end' : ''}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row[0]} className="border-b border-border/20 last:border-0">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="py-1 pe-2 text-left font-medium text-foreground">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="py-1 pe-2 text-end tabular-nums">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.note || table.sourceUrl ? (
        <p className="mt-2 text-xs text-muted">
          {table.note}
          {table.note && table.sourceUrl ? ' · ' : ''}
          <Source url={table.sourceUrl} label={t('pin.perf.source')} />
        </p>
      ) : null}
    </div>
  );
}
