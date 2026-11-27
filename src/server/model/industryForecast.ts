// Industry forecast rows (IndustryForecast, 0216) and the lines drawn from them.

import * as db from '../db';
import { getFredSeries } from '../fredSeries';
import type { ForecastLine, ForecastSource, IndustryForecastInput, IndustryForecastJson } from '@/lib/industryForecast';
import { isPinSubjectForecast, matchesPinForecast, matchesTags, snapshotProblem } from '@/lib/industryForecast';

type Row = {
  slug: string;
  industry: string;
  title: string;
  tags: string[];
  prefix: string;
  suffix: string;
  live: { fredId: string; label: string }[];
  snapshot: ForecastLine[];
  projection: ForecastLine | null;
  earlier: ForecastLine[];
  sources: ForecastSource[];
  note: string | null;
  checkedAt: Date;
};

const COLUMNS = `"slug", "industry", "title", "tags", "prefix", "suffix", "live", "snapshot", "projection", "earlier", "sources", "note", "checkedAt"`;

// Monthly FRED points kept per line: three years reads as a trend without
// shipping the whole history.
const LIVE_MONTHS = 40;

async function toJson(row: Row): Promise<IndustryForecastJson> {
  const live = await Promise.all(
    row.live.map(async (l): Promise<ForecastLine | null> => {
      const series = await getFredSeries(l.fredId);
      return series ? { kind: 'live', label: l.label, points: series.points.slice(-LIVE_MONTHS).map((p) => ({ x: p.day, value: p.value })) } : null;
    }),
  );
  return {
    slug: row.slug,
    industry: row.industry,
    title: row.title,
    tags: row.tags,
    prefix: row.prefix,
    suffix: row.suffix,
    live: row.live,
    lines: [...live.filter((l): l is ForecastLine => !!l), ...row.snapshot.map((l) => ({ ...l, kind: 'snapshot' as const }))],
    projection: row.projection,
    earlier: row.earlier.map((l) => ({ ...l, kind: 'earlier' as const })),
    sources: row.sources,
    note: row.note,
    checkedAt: new Date(row.checkedAt).toISOString(),
  };
}

async function all(): Promise<Row[]> {
  return db.query<Row>(`SELECT ${COLUMNS} FROM "IndustryForecast" ORDER BY "id"`);
}

// Searches match related tags; pin sidebars require the forecast's industry.
export async function forecastSlugsForNames(names: readonly (string | null | undefined)[], scope: 'search' | 'pin' = 'search', title?: string | null): Promise<string[]> {
  const wanted = names.filter((n): n is string => !!n).map((n) => n.trim().toLowerCase());
  if (scope === 'pin' && matchesTags(['AI Models'], wanted)) wanted.push('ai');
  if (!wanted.length) return [];
  const rows = await db.query<Pick<Row, 'slug' | 'industry' | 'title' | 'tags'> & { points: number }>(
    `SELECT "slug", "industry", "title", "tags",
       (SELECT coalesce(sum(jsonb_array_length(l->'points')), 0) FROM jsonb_array_elements("snapshot" || "earlier" || coalesce(jsonb_build_array("projection"), '[]'::jsonb)) l WHERE jsonb_typeof(l->'points') = 'array')
       + jsonb_array_length("live") * ${LIVE_MONTHS} AS "points"
     FROM "IndustryForecast"
     WHERE ${scope === 'pin' ? 'lower("industry") = ANY($1)' : 'EXISTS (SELECT 1 FROM unnest("tags") t WHERE lower(t) = ANY($1))'}
     ORDER BY "id"`,
    [wanted],
  );
  // Equal matches: the chart with more data points ranks higher (stable, so
  // ties keep id order).
  const byPoints = (a: { points: number }, b: { points: number }) => Number(b.points) - Number(a.points);
  const matched = rows.filter((r) => scope !== 'pin' || matchesPinForecast(r, wanted, title)).sort(byPoints);
  if (scope !== 'pin') return matched.map((r) => r.slug);
  const own = (r: { slug: string }) => isPinSubjectForecast(r.slug, wanted, title);
  return [...matched.filter(own), ...matched.filter((r) => !own(r))].map((r) => r.slug);
}

export async function allForecasts(): Promise<IndustryForecastJson[]> {
  return Promise.all((await all()).map(toJson));
}

export async function forecastsBySlugs(slugs: string[]): Promise<IndustryForecastJson[]> {
  if (!slugs.length) return [];
  const rows = (await all()).filter((r) => slugs.includes(r.slug)).sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
  const out = await Promise.all(rows.map(toJson));
  // A single-bar chart says little next to a trend line: it sorts after the
  // rest, so a panel with a card limit tucks it behind "Show more". The sort
  // is stable, so everything else keeps its id order.
  const single = (f: IndustryForecastJson) => !f.live.length && !f.earlier.length && f.lines.reduce((n, l) => n + l.points.length, 0) + (f.projection?.points.length ?? 0) <= 1;
  return [...out.filter((f) => !single(f)), ...out.filter(single)];
}

// Saves one row whole (checked by forecastProblem). The live handles and the
// snapshot are the row's own unless the input gives live.
export async function saveIndustryForecast(r: IndustryForecastInput, snapshot: ForecastLine[] | undefined = r.history): Promise<void> {
  await db.query(
    `INSERT INTO "IndustryForecast" ("slug","industry","title","tags","prefix","suffix","live","snapshot","projection","earlier","sources","note","checkedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
     ON CONFLICT ("slug") DO UPDATE SET "industry"=$2,"title"=$3,"tags"=$4,"prefix"=$5,"suffix"=$6,
       "live"=CASE WHEN $13 THEN $7 ELSE "IndustryForecast"."live" END,
       "snapshot"=CASE WHEN $14 THEN $8 ELSE "IndustryForecast"."snapshot" END,
       "projection"=$9,"earlier"=$10,"sources"=$11,"note"=$12,"checkedAt"=now()`,
    [
      r.slug, r.industry, r.title, r.tags, r.prefix, r.suffix,
      JSON.stringify(r.live ?? []), JSON.stringify(snapshot ?? []),
      r.projection ? JSON.stringify(r.projection) : null,
      JSON.stringify(r.earlier), JSON.stringify(r.sources), r.note,
      r.live != null, snapshot != null,
    ],
  );
}

// The BTOS lines of the AI adoption row, replaced.
export class SnapshotRejected extends Error {}

// Replaces a row's stored lines. Every refresh job and the admin route save through
// here, so a feed that changed units is refused before it overwrites good data
// (snapshotProblem); { force: true } is for a reviewed, genuine jump.
export async function saveForecastSnapshot(slug: string, snapshot: ForecastLine[], opts: { force?: boolean } = {}): Promise<boolean> {
  if (!opts.force) {
    const [current] = await db.query<{ snapshot: ForecastLine[] }>(`SELECT "snapshot" FROM "IndustryForecast" WHERE "slug" = $1`, [slug]);
    const problem = current ? snapshotProblem(current.snapshot ?? [], snapshot) : null;
    if (problem) throw new SnapshotRejected(`${slug} snapshot not saved: ${problem}`);
  }
  const rows = await db.query<{ slug: string }>(`UPDATE "IndustryForecast" SET "snapshot" = $2, "checkedAt" = now() WHERE "slug" = $1 RETURNING "slug"`, [slug, JSON.stringify(snapshot)]);
  return rows.length === 1;
}

// For the jobs' status tool: each row's age and newest data.
export async function forecastStatus() {
  const rows = await all();
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    tags: r.tags,
    checkedAt: new Date(r.checkedAt).toISOString().slice(0, 10),
    live: r.live.map((l) => l.fredId),
    snapshotThrough: r.snapshot.map((l) => l.points.at(-1)?.x).filter(Boolean)[0] ?? null,
    projection: r.projection ? { label: r.projection.label, points: r.projection.points.map((p) => `${p.x}: ${p.value}`) } : null,
    earlier: r.earlier.map((e) => e.label),
    sources: r.sources.map((s) => ({ url: s.url, date: s.date })),
  }));
}
