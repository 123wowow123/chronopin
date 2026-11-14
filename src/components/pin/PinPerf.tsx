import { CitedText } from "@/components/pin/CitedText";
import type { Evidence } from "@/lib/referenceConfidence";
import type { Translator } from "@/lib/i18n/translate";
import {
  formatPerfValue,
  type PerfChart,
  type PerfTable,
  type PinPerfJson,
} from "@/lib/pinPerf";

// A hardware pin's published performance figures (PinPerf, 0198): one bar chart
// per comparison and one table per spec sheet. Server-rendered, so the figures
// are in the page's HTML for readers and crawlers alike, and each chart has its
// numbers printed on the bars (the table view of a bar chart is its labels).
//
// The bars are one kind of mark: the field is the recessive ink tone and the
// pin's own part wears the accent token, both redefined per theme in
// globals.css. Bars start at zero and scale to the longest, so lengths are
// honest. Every block names its source page.
// Dollar figures are always green and carry their sign, so a price is the first thing the eye finds. A chart whose
// unit is dollars prints its bar values that way; "$77.1" inside a note or a table cell is picked out of the text.
const MONEY =
  /(\$\d[\d,]*(?:\.\d+)?(?:[kKmMbB]|\s?(?:million|billion|trillion))?)/g;
const isMoneyUnit = (unit?: string) => !!unit && /usd|\$|dollar/i.test(unit);

// A candidate's bar wears their party's colour (mid-tones that read on every theme).
const PARTY_COLOR: Record<string, string> = { D: "#2f6fdb", R: "#d93a3a", I: "#8b8fa3", G: "#2e9b57", L: "#d9a21b" };

function Money({ text }: { text: string }) {
  return (
    <>
      {text.split(MONEY).map((part, i) =>
        i % 2 ? (
          <span key={i} className="font-semibold text-success tabular-nums">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function PinPerf({
  perf,
  t,
  locale,
  evidence = [],
  className = "",
}: {
  perf: PinPerfJson;
  t: Translator;
  locale: string;
  evidence?: Evidence[];
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-4 text-sm ${className}`}
      aria-label={t("pin.perf.heading")}
    >
      {perf.charts.map((chart) => (
        <Chart key={chart.title} chart={chart} t={t} locale={locale} />
      ))}
      {perf.tables.map((table) => (
        <Table
          key={table.title}
          table={table}
          t={t}
          locale={locale}
          evidence={evidence}
        />
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

function Chart({
  chart: base,
  t,
  locale,
}: {
  chart: PerfChart;
  t: Translator;
  locale: string;
}) {
  const chart = { ...base, ...base.i18n?.[locale] };
  const max = Math.max(...chart.bars.map((bar) => bar.value)) || 1;
  // A chart that names people (party-coloured election bars, or any long label) gives labels 40% of the row and wraps rather than truncates.
  const named = chart.bars.some((bar) => bar.party) || chart.bars.some((bar) => bar.label.length > 24);
  const money = isMoneyUnit(chart.unit);
  return (
    <figure className="surface rounded-lg px-3 py-2">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">
          {chart.title}
        </span>
        <span className="text-xs text-muted">{chart.unit}</span>
      </figcaption>
      <ul className="flex flex-col gap-1.5">
        {chart.bars.map((bar) => (
          <li
            key={bar.label}
            className={`grid items-center gap-2 text-xs ${named ? "grid-cols-[minmax(0,40%)_1fr_auto]" : "grid-cols-[minmax(0,8rem)_1fr_auto]"}`}
          >
            <span
              className={`${named ? "leading-tight" : "truncate"} ${bar.highlight ? "font-semibold text-foreground" : "text-muted"}`}
              title={bar.label}
            >
              {bar.label}
            </span>
            <span className="h-3 rounded-sm bg-raised" aria-hidden>
              <span
                className={`block h-full rounded-sm ${bar.party ? "" : bar.highlight ? "bg-link" : "bg-subtle/60"}`}
                style={{
                  ...(bar.party ? { backgroundColor: PARTY_COLOR[bar.party], opacity: bar.highlight ? 1 : 0.8 } : {}),
                  width: `${Math.max((bar.value / max) * 100, bar.value > 0 ? 1 : 0)}%`,
                }}
              />
            </span>
            <span
              className={`tabular-nums ${money ? "font-semibold text-success" : bar.highlight ? "font-semibold text-foreground" : "text-muted"}`}
            >
              {money
                ? `$${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(bar.value)}`
                : formatPerfValue(bar.value, locale)}
            </span>
          </li>
        ))}
      </ul>
      {chart.note || chart.sourceUrl ? (
        <p className="mt-2 text-xs text-muted">
          {chart.note ? <Money text={chart.note} /> : null}
          {chart.note && chart.sourceUrl ? " · " : ""}
          <Source url={chart.sourceUrl} label={t("pin.perf.source")} />
        </p>
      ) : null}
    </figure>
  );
}

const TILE_DOTS = [
  "bg-amber-400",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-rose-400",
  "bg-teal-400",
];

// A three-column table (measure, figure, basis) as the datacenter panel's
// telemetry tiles: the figure large, the basis beneath it.
function Tiles({
  table,
  t,
  evidence,
}: {
  table: PerfTable;
  t: Translator;
  evidence: Evidence[];
}) {
  return (
    <section
      className="surface rounded-2xl border border-line bg-raised/40 p-4 shadow-sm"
      aria-label={table.title}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">
          {table.title}
        </h2>
        {table.sourceUrl ? (
          <a
            href={table.sourceUrl}
            rel="noopener nofollow"
            target="_blank"
            className="inline-flex items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-link ring-1 ring-line ring-inset hover:no-underline"
          >
            {t("pin.perf.source")}
          </a>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {table.rows.map(([label, figure, basis], i) => (
          <li
            key={label}
            className="flex flex-col rounded-xl border border-line/70 bg-panel/70 p-3"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">
              <span
                className={`size-2 shrink-0 rounded-full ${TILE_DOTS[i % TILE_DOTS.length]}`}
                aria-hidden
              />
              {label}
            </div>
            <div className="mt-1.5 text-lg leading-tight font-bold tracking-tight text-ink">
              <Money text={figure} />
            </div>
            <div className="mt-1 text-xs text-muted">
              <CitedText text={basis} evidence={evidence} label />
            </div>
          </li>
        ))}
      </ul>
      {table.note ? (
        <p className="mt-3 text-xs text-muted">
          <Money text={table.note} />
        </p>
      ) : null}
    </section>
  );
}

const PLANNED = /^(planned|expected|target)/i;

// A four-column table (date, milestone, status, source) as a project timeline: an optional stage stepper with the
// reached stage highlighted, then one dot per dated milestone (hollow while planned) and its [n] reference.
// Whether a row is planned is read from the English base table, as a translation words the status differently.
function Timeline({
  table,
  base,
  evidence,
}: {
  table: PerfTable;
  base: PerfTable;
  evidence: Evidence[];
}) {
  const stages = table.stages ?? [];
  return (
    <section className="surface rounded-xl px-4 py-4" aria-label={table.title}>
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
        {table.title}
      </h2>
      {stages.length ? (
        <ol
          className="mt-4 grid text-center text-[11px] leading-tight"
          style={{
            gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
          }}
        >
          {stages.map((stage, i) => {
            const current = i === base.current;
            return (
              <li
                key={stage}
                aria-current={current ? "step" : undefined}
                className="relative flex flex-col items-center gap-1.5 px-0.5"
              >
                {i > 0 ? (
                  <span
                    aria-hidden
                    className="absolute start-[-50%] top-[7px] h-0.5 w-full bg-raised-2"
                  />
                ) : null}
                <span
                  aria-hidden
                  className={`relative z-10 size-4 rounded-full border-2 ${current ? "border-link bg-link ring-4 ring-raised-2" : "border-raised-2 bg-raised"}`}
                />
                <span
                  className={
                    current
                      ? "font-semibold text-link"
                      : (base.current ?? 0) > i
                        ? "text-muted"
                        : "text-muted opacity-70"
                  }
                >
                  {stage}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      <ol className="mt-4 ms-1.5 border-s-2 border-raised-2">
        {table.rows.map(([date, label, status, source], i) => {
          const planned = PLANNED.test(base.rows[i][2].trim());
          return (
            <li key={i} className="relative pb-4 ps-5 text-xs last:pb-0">
              <span
                aria-hidden
                className={`absolute -start-[7px] top-0.5 size-3 rounded-full border-2 border-link ${planned ? "bg-raised" : "bg-link"}`}
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold tabular-nums">
                  {date}
                </span>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${planned ? "border border-dashed border-muted text-muted" : "bg-link text-raised"}`}
                >
                  {status}
                </span>
              </div>
              <p className="mt-0.5 text-sm">
                {label}
                <CitedText text={source} evidence={evidence} label citesOnly />
              </p>
            </li>
          );
        })}
      </ol>
      {table.note ? (
        <p className="mt-3 text-[11px] text-muted">{table.note}</p>
      ) : null}
    </section>
  );
}

function Table({
  table: base,
  t,
  locale,
  evidence,
}: {
  table: PerfTable;
  t: Translator;
  locale: string;
  evidence: Evidence[];
}) {
  const table = { ...base, ...base.i18n?.[locale] };
  if (base.display === "tiles" && table.columns.length === 3)
    return <Tiles table={table} t={t} evidence={evidence} />;
  if (base.display === "timeline" && table.columns.length === 4)
    return <Timeline table={table} base={base} evidence={evidence} />;
  // A source column is shown as [n] links after the previous cell, not as a column.
  const last = table.columns.length - 1;
  const sourceColumn =
    last >= 2 &&
    (table.columns[last].trim().toLowerCase() ===
      t("pin.perf.source").toLowerCase() ||
      /^sources?$/i.test(table.columns[last].trim()));
  const columns = sourceColumn ? table.columns.slice(0, last) : table.columns;
  return (
    <div className="surface rounded-lg px-3 py-2">
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
        {table.title}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40 text-left text-muted">
              {columns.map((column, i) => (
                <th
                  key={column}
                  scope="col"
                  className={`py-1 pe-2 font-semibold ${i ? "text-end" : ""}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr
                key={row[0]}
                className="border-b border-border/20 last:border-0"
              >
                {row.slice(0, columns.length).map((cell, i) =>
                  i === 0 ? (
                    <th
                      key={i}
                      scope="row"
                      className="py-1 pe-2 text-left font-medium text-foreground"
                    >
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="py-1 pe-2 text-end tabular-nums">
                      {sourceColumn ? (
                        <Money text={cell} />
                      ) : (
                        <CitedText text={cell} evidence={evidence} label />
                      )}
                      {sourceColumn && i === columns.length - 1 ? (
                        <CitedText
                          text={row[last]}
                          evidence={evidence}
                          label
                          citesOnly
                        />
                      ) : null}
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
          {table.note ? <Money text={table.note} /> : null}
          {table.note && table.sourceUrl ? " · " : ""}
          <Source url={table.sourceUrl} label={t("pin.perf.source")} />
        </p>
      ) : null}
    </div>
  );
}
