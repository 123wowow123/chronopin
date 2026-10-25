// A hardware pin's published performance figures (PinPerf, 0198): bar charts
// comparing the part with its predecessor or rivals, and spec tables. Every
// chart and table is the vendor's or a benchmark body's own numbers and names
// its source page.

export type PerfBar = { label: string; value: number; highlight?: boolean };
// The English text is the default; i18n holds the same text per locale. A chart's
// bars keep their labels (product names); a table's translation restates every
// column and row, so it has the same shape.
export type PerfChartText = { title: string; unit: string; note?: string };
export type PerfTableText = { title: string; columns: string[]; rows: string[][]; note?: string };
export type PerfChart = PerfChartText & { higherIsBetter?: boolean; sourceUrl?: string; bars: PerfBar[]; i18n?: Record<string, PerfChartText> };
// display: 'tiles' shows a three-column table (measure, figure, basis) as telemetry tiles.
export type PerfTable = PerfTableText & { sourceUrl?: string; display?: 'tiles'; i18n?: Record<string, PerfTableText> };
export type PinPerfJson = { charts: PerfChart[]; tables: PerfTable[]; checkedAt: string };

export const MAX_PERF_CHARTS = 6;
export const MAX_PERF_TABLES = 6;
export const MAX_PERF_BARS = 12;
export const MAX_PERF_ROWS = 40;

const text = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : null);
const url = (value: unknown): string | null | undefined =>
  value === undefined || value === null || value === '' ? undefined : typeof value === 'string' && /^https?:\/\/\S+$/i.test(value) && value.length <= 4000 ? value : null;

type Loose = Record<string, unknown> | null | undefined;

function chartText(raw: unknown): PerfChartText | string {
  const v = raw as Loose;
  const title = text(v?.title, 120);
  const unit = text(v?.unit, 40);
  const note = v?.note ? text(v.note, 500) : undefined;
  if (!title || !unit || (v?.note && !note)) return 'a translation needs title and unit (note optional).';
  return { title, unit, ...(note ? { note } : {}) };
}

function tableText(raw: unknown, columns: number, rows: number): PerfTableText | string {
  const v = raw as { title?: unknown; note?: unknown; columns?: unknown; rows?: unknown } | null | undefined;
  const title = text(v?.title, 120);
  const note = v?.note ? text(v.note, 500) : undefined;
  if (!title || (v?.note && !note)) return 'a translation needs a title.';
  if (!v || !Array.isArray(v.columns) || v.columns.length !== columns || !Array.isArray(v.rows) || v.rows.length !== rows) return 'a translation needs the same columns and rows.';
  const cols = v.columns.map((c: unknown) => text(c, 80));
  const cells = v.rows.map((row: unknown) => (Array.isArray(row) && row.length === columns ? row.map((cell: unknown) => text(cell, 200)) : null));
  if (cols.includes(null) || cells.some((row: (string | null)[] | null) => !row || row.includes(null))) return 'a translation has an empty or oversize cell.';
  return { title, columns: cols as string[], rows: cells as string[][], ...(note ? { note } : {}) };
}

function i18nProblem<T>(raw: unknown, one: (v: unknown) => T | string): Record<string, T> | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'i18n must map locales to text.';
  const out: Record<string, T> = {};
  for (const [locale, v] of Object.entries(raw)) {
    if (!/^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(locale)) return `i18n: ${locale} is not a locale.`;
    const parsed = one(v);
    if (typeof parsed === 'string') return `i18n ${locale}: ${parsed}`;
    out[locale] = parsed;
  }
  return out;
}

// The cleaned charts and tables, or a sentence saying what is wrong.
export function perfProblem(body: Record<string, unknown>): { charts: PerfChart[]; tables: PerfTable[] } | string {
  const rawCharts = body.charts ?? [];
  const rawTables = body.tables ?? [];
  if (!Array.isArray(rawCharts) || !Array.isArray(rawTables)) return 'charts and tables must be lists.';
  if (rawCharts.length > MAX_PERF_CHARTS || rawTables.length > MAX_PERF_TABLES) return `At most ${MAX_PERF_CHARTS} charts and ${MAX_PERF_TABLES} tables.`;
  const charts: PerfChart[] = [];
  for (const [i, c] of rawCharts.entries()) {
    const title = text(c?.title, 120);
    const unit = text(c?.unit, 40);
    if (!title || !unit) return `chart ${i + 1}: title and unit are required.`;
    if (!Array.isArray(c.bars) || c.bars.length < 2 || c.bars.length > MAX_PERF_BARS) return `chart ${i + 1}: needs 2 to ${MAX_PERF_BARS} bars.`;
    const bars: PerfBar[] = [];
    for (const b of c.bars) {
      const label = text(b?.label, 80);
      if (!label || typeof b.value !== 'number' || !Number.isFinite(b.value) || b.value < 0) return `chart ${i + 1}: every bar needs a label and a non-negative number.`;
      bars.push({ label, value: b.value, ...(b.highlight ? { highlight: true } : {}) });
    }
    const sourceUrl = url(c.sourceUrl);
    if (sourceUrl === null) return `chart ${i + 1}: sourceUrl is not a web address.`;
    const note = c.note ? text(c.note, 500) : undefined;
    if (c.note && !note) return `chart ${i + 1}: note is at most 500 characters.`;
    const i18n = c.i18n === undefined ? undefined : i18nProblem(c.i18n, chartText);
    if (typeof i18n === 'string') return `chart ${i + 1}: ${i18n}`;
    charts.push({ title, unit, ...(i18n ? { i18n } : {}), ...(c.higherIsBetter === false ? { higherIsBetter: false } : {}), ...(note ? { note } : {}), ...(sourceUrl ? { sourceUrl } : {}), bars });
  }
  const tables: PerfTable[] = [];
  for (const [i, tb] of rawTables.entries()) {
    const title = text(tb?.title, 120);
    if (!title) return `table ${i + 1}: title is required.`;
    if (!Array.isArray(tb.columns) || tb.columns.length < 2 || tb.columns.length > 8) return `table ${i + 1}: needs 2 to 8 columns.`;
    const columns = tb.columns.map((col: unknown) => text(col, 80));
    if (columns.some((col: string | null) => !col)) return `table ${i + 1}: every column needs a heading.`;
    if (!Array.isArray(tb.rows) || !tb.rows.length || tb.rows.length > MAX_PERF_ROWS) return `table ${i + 1}: needs 1 to ${MAX_PERF_ROWS} rows.`;
    const rows: string[][] = [];
    for (const row of tb.rows) {
      if (!Array.isArray(row) || row.length !== columns.length) return `table ${i + 1}: every row needs one cell per column.`;
      const cells = row.map((cell: unknown) => (typeof cell === 'number' ? String(cell) : text(cell, 200)));
      if (cells.some((cell: string | null) => cell === null)) return `table ${i + 1}: cells are text of at most 200 characters.`;
      rows.push(cells as string[]);
    }
    const sourceUrl = url(tb.sourceUrl);
    if (sourceUrl === null) return `table ${i + 1}: sourceUrl is not a web address.`;
    const note = tb.note ? text(tb.note, 500) : undefined;
    if (tb.note && !note) return `table ${i + 1}: note is at most 500 characters.`;
    const i18n = tb.i18n === undefined ? undefined : i18nProblem(tb.i18n, (v) => tableText(v, columns.length, rows.length));
    if (typeof i18n === 'string') return `table ${i + 1}: ${i18n}`;
    tables.push({ title, columns: columns as string[], rows, ...(tb.display === 'tiles' && columns.length === 3 ? { display: 'tiles' as const } : {}), ...(i18n ? { i18n } : {}), ...(note ? { note } : {}), ...(sourceUrl ? { sourceUrl } : {}) });
  }
  if (!charts.length && !tables.length) return 'At least one chart or table.';
  return { charts, tables };
}

export const hasPerf = (perf: PinPerfJson | null | undefined): perf is PinPerfJson => !!perf && perf.charts.length + perf.tables.length > 0;

// 1,200 / 3.6 / 0.05: whole numbers with separators, small ones to what they need.
export const formatPerfValue = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2 }).format(value);
