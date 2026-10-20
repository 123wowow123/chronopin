// A hardware pin's published performance figures (PinPerf, 0198): bar charts
// comparing the part with its predecessor or rivals, and spec tables. Every
// chart and table is the vendor's or a benchmark body's own numbers and names
// its source page.

export type PerfBar = { label: string; value: number; highlight?: boolean };
export type PerfChart = { title: string; unit: string; higherIsBetter?: boolean; note?: string; sourceUrl?: string; bars: PerfBar[] };
export type PerfTable = { title: string; columns: string[]; rows: string[][]; note?: string; sourceUrl?: string };
export type PinPerfJson = { charts: PerfChart[]; tables: PerfTable[]; checkedAt: string };

export const MAX_PERF_CHARTS = 6;
export const MAX_PERF_TABLES = 6;
export const MAX_PERF_BARS = 12;
export const MAX_PERF_ROWS = 40;

const text = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : null);
const url = (value: unknown): string | null | undefined =>
  value === undefined || value === null || value === '' ? undefined : typeof value === 'string' && /^https?:\/\/\S+$/i.test(value) && value.length <= 4000 ? value : null;

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
    charts.push({ title, unit, ...(c.higherIsBetter === false ? { higherIsBetter: false } : {}), ...(note ? { note } : {}), ...(sourceUrl ? { sourceUrl } : {}), bars });
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
    tables.push({ title, columns: columns as string[], rows, ...(note ? { note } : {}), ...(sourceUrl ? { sourceUrl } : {}) });
  }
  if (!charts.length && !tables.length) return 'At least one chart or table.';
  return { charts, tables };
}

export const hasPerf = (perf: PinPerfJson | null | undefined): perf is PinPerfJson => !!perf && perf.charts.length + perf.tables.length > 0;

// 1,200 / 3.6 / 0.05: whole numbers with separators, small ones to what they need.
export const formatPerfValue = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2 }).format(value);
