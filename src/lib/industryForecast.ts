// Industry forecast panels (IndustryForecast, 0216): a metric for an industry,
// drawn from live public series, a stored snapshot and/or a cited projection.

export type ForecastPoint = { x: string; value: number };
export type ForecastLine = { label: string; points: ForecastPoint[]; kind?: 'live' | 'snapshot' | 'earlier'; publishedDate?: string };
export type ForecastSource = { label: string; url: string; date: string | null; quote: string | null };

export type IndustryForecastJson = {
  slug: string;
  industry: string;
  title: string;
  tags: string[];
  prefix: string;
  suffix: string;
  // Live series: FRED handles read on view; the API fills in the lines.
  live: { fredId: string; label: string }[];
  lines: ForecastLine[];
  // A published forecast; points are years ("2027") and never drawn as actuals.
  projection: ForecastLine | null;
  // Earlier editions of the projection the publisher has since revised, oldest first.
  earlier: ForecastLine[];
  sources: ForecastSource[];
  note: string | null;
  checkedAt: string;
};

const norm = (s: string) => s.trim().toLowerCase();

// Whether any of a pin's (or a search's) tag and category names is one of the
// forecast's, in any case.
export function matchesTags(forecastTags: readonly string[], names: readonly (string | null | undefined)[]): boolean {
  const wanted = new Set(forecastTags.map(norm));
  return names.some((n) => !!n && wanted.has(norm(n)));
}

export function formatForecastValue(f: Pick<IndustryForecastJson, 'prefix' | 'suffix'>, v: number): string {
  const n = Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v * 100) / 100);
  return `${f.prefix}${n}${f.suffix}`;
}

// What the jobs' save_industry_forecast tool and the admin endpoint accept: one
// row, whole. live and snapshot are optional (a save without them keeps the
// row's own); everything cited needs an HTTPS source.
export type IndustryForecastInput = {
  slug: string;
  industry: string;
  title: string;
  tags: string[];
  prefix: string;
  suffix: string;
  live?: { fredId: string; label: string }[];
  projection: ForecastLine | null;
  earlier: ForecastLine[];
  sources: ForecastSource[];
  note: string | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function lineProblem(v: unknown, what: string, dated: boolean): ForecastLine | string {
  if (!isRecord(v) || !text(v.label, 120)) return `${what}: needs a label.`;
  if (dated && !isDay(v.publishedDate)) return `${what}: publishedDate must be YYYY-MM-DD.`;
  if (!Array.isArray(v.points) || !v.points.length || v.points.length > 12) return `${what}: 1 to 12 points.`;
  const points: ForecastPoint[] = [];
  for (const p of v.points) {
    if (!isRecord(p) || typeof p.x !== 'string' || !/^\d{4}(-\d{2}-\d{2})?$/.test(p.x) || typeof p.value !== 'number' || !Number.isFinite(p.value)) return `${what}: points are { x: "2027", value: number }.`;
    points.push({ x: p.x, value: p.value });
  }
  return { label: v.label, points, ...(dated ? { publishedDate: v.publishedDate as string } : {}) };
}

export function forecastProblem(input: unknown): IndustryForecastInput | string {
  if (!isRecord(input)) return 'Expected a forecast object.';
  if (typeof input.slug !== 'string' || !/^[a-z0-9-]{1,80}$/.test(input.slug)) return 'slug: lowercase letters, digits and hyphens.';
  if (!text(input.industry, 80) || !text(input.title, 200)) return 'industry and title are required.';
  if (!Array.isArray(input.tags) || !input.tags.length || !input.tags.every((t) => text(t, 80))) return 'tags: at least one pin tag or category name.';
  if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length > 8) return 'sources: 1 to 8, each opened this run.';
  const sources: ForecastSource[] = [];
  for (const s of input.sources) {
    if (!isRecord(s) || !text(s.label, 300) || typeof s.url !== 'string') return 'sources: { label, url, date, quote }.';
    try {
      const u = new URL(s.url);
      if (u.protocol !== 'https:' || u.username || u.password) return `sources: ${s.url} is not a plain HTTPS address.`;
    } catch {
      return `sources: ${s.url} is not a web address.`;
    }
    if (!(s.date == null || isDay(s.date))) return 'sources: date is YYYY-MM-DD or null.';
    if (!(s.quote == null || text(s.quote, 300))) return 'sources: quote is verbatim, at most 300 characters.';
    sources.push({ label: s.label, url: s.url, date: (s.date as string | null) ?? null, quote: (s.quote as string | null) ?? null });
  }
  let projection: ForecastLine | null = null;
  if (input.projection != null) {
    const line = lineProblem(input.projection, 'projection', false);
    if (typeof line === 'string') return line;
    // A projected figure needs a quote from a source that states it.
    if (!sources.some((s) => s.quote)) return 'projection: at least one source needs a verbatim quote.';
    projection = line;
  }
  const earlier: ForecastLine[] = [];
  for (const e of Array.isArray(input.earlier) ? input.earlier : []) {
    const line = lineProblem(e, 'earlier', true);
    if (typeof line === 'string') return line;
    earlier.push(line);
  }
  if (earlier.length && !projection) return 'earlier editions need a current projection to compare with.';
  const live = Array.isArray(input.live) ? input.live : undefined;
  if (live && !live.every((l) => isRecord(l) && typeof l.fredId === 'string' && /^[A-Z0-9_]{1,40}$/.test(l.fredId) && text(l.label, 120))) return 'live: [{ fredId, label }].';
  return {
    slug: input.slug,
    industry: input.industry,
    title: input.title,
    tags: input.tags as string[],
    prefix: typeof input.prefix === 'string' ? input.prefix.slice(0, 8) : '',
    suffix: typeof input.suffix === 'string' ? input.suffix.slice(0, 8) : '',
    ...(live ? { live: live as { fredId: string; label: string }[] } : {}),
    projection,
    earlier,
    sources,
    note: typeof input.note === 'string' && input.note.trim() ? input.note.trim().slice(0, 1500) : null,
  };
}
