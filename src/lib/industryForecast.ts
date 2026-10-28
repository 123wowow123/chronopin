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

// The URL segment of an industry: /forecasts/<slug>.
export const industrySlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const norm = (s: string) => s.trim().toLowerCase();

// Whether any of a pin's (or a search's) tag and category names is one of the
// forecast's, in any case.
export function matchesTags(forecastTags: readonly string[], names: readonly (string | null | undefined)[]): boolean {
  const wanted = new Set(forecastTags.map(norm));
  return names.some((n) => !!n && wanted.has(norm(n)));
}

// Commodity charts inside a broad industry (Food) need the pin to be about
// that commodity: its tags or title must name one of these words.
const PIN_SUBJECT_TERMS: Record<string, RegExp> = {
  'fao-cereal-production': /\b(cereals?|grains?|wheat|rice|maize|corn|barley|oats?|flour|crops?|farming)\b/i,
  'wb-cocoa-price': /\b(cocoa|cacao|chocolat(e|es|ier|iers)?|confectioner(y|ies))\b/i,
  'wb-arabica-coffee-price': /\b(coffee|espresso|arabica|baristas?|cafe|café)\b/i,
  'wb-urea-fertilizer-price': /\b(fertili[sz]ers?|urea|agricultur(e|al)|farming|crops?)\b/i,
  'wb-rice-price': /\b(rice|grains?|paddy)\b/i,
  'oecd-fao-world-wheat-production': /\b(wheat|bread|flour|bakery|grains?|cereals?|pasta)\b/i,
  'oecd-fao-world-poultry-consumption': /\b(poultry|chicken|turkey|nuggets?|wings?)\b/i,
};

// Pin sidebars require the forecast's own industry, rather than any related
// tag, and, for commodity charts, the commodity in the pin's tags or title.
// AI sector charts additionally require AI on the pin.
export function matchesPinForecast(
  forecast: Pick<IndustryForecastJson, 'industry' | 'title' | 'tags'> & { slug?: string },
  names: readonly (string | null | undefined)[],
  title?: string | null,
): boolean {
  const subject = forecast.slug ? PIN_SUBJECT_TERMS[forecast.slug] : undefined;
  if (subject && ![...names, title].some((n) => !!n && subject.test(n))) return false;
  const aiNames = ['AI', 'AI Models'];
  const aiPin = matchesTags(aiNames, names);
  const aiForecast = matchesTags(aiNames, [forecast.industry, ...forecast.tags]) || /\bAI\b/i.test(forecast.title);
  if (aiForecast && !aiPin) return false;
  return matchesTags([forecast.industry], aiPin ? [...names, 'AI'] : names);
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
  // Published actuals drawn solid before the projection (stored as the row's
  // snapshot); omitted keeps whatever the row holds (the BTOS lines).
  history?: ForecastLine[];
  projection: ForecastLine | null;
  earlier: ForecastLine[];
  sources: ForecastSource[];
  note: string | null;
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function lineProblem(v: unknown, what: string, dated: boolean, max = 12): ForecastLine | string {
  if (!isRecord(v) || !text(v.label, 120)) return `${what}: needs a label.`;
  if (dated && !isDay(v.publishedDate)) return `${what}: publishedDate must be YYYY-MM-DD.`;
  if (!Array.isArray(v.points) || !v.points.length || v.points.length > max) return `${what}: 1 to ${max} points.`;
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
  if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length > 14) return 'sources: 1 to 14, each opened this run.';
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
  let history: ForecastLine[] | undefined;
  if (input.history != null) {
    if (!Array.isArray(input.history) || input.history.length > 3) return 'history: up to 3 lines.';
    history = [];
    for (const h of input.history) {
      const line = lineProblem(h, 'history', false, 30);
      if (typeof line === 'string') return line;
      history.push(line);
    }
  }
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
    ...(history ? { history } : {}),
    projection,
    earlier,
    sources,
    note: typeof input.note === 'string' && input.note.trim() ? input.note.trim().slice(0, 1500) : null,
  };
}
