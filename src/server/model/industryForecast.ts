// Industry forecast rows (IndustryForecast, 0216) and the lines drawn from them.

import * as db from '../db';
import { getFredSeries } from '../fredSeries';
import type { ForecastLine, ForecastSource, IndustryForecastInput, IndustryForecastJson } from '@/lib/industryForecast';
import { matchesPinForecast, matchesTags } from '@/lib/industryForecast';

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
export async function forecastSlugsForNames(names: readonly (string | null | undefined)[], scope: 'search' | 'pin' = 'search'): Promise<string[]> {
  const wanted = names.filter((n): n is string => !!n).map((n) => n.trim().toLowerCase());
  if (scope === 'pin' && matchesTags(['AI Models'], wanted)) wanted.push('ai');
  if (!wanted.length) return [];
  const rows = await db.query<Pick<Row, 'slug' | 'industry' | 'title' | 'tags'>>(
    `SELECT "slug", "industry", "title", "tags" FROM "IndustryForecast"
     WHERE ${scope === 'pin' ? 'lower("industry") = ANY($1)' : 'EXISTS (SELECT 1 FROM unnest("tags") t WHERE lower(t) = ANY($1))'}
     ORDER BY "id"`,
    [wanted],
  );
  return rows.filter((r) => scope !== 'pin' || matchesPinForecast(r, wanted)).map((r) => r.slug);
}

export async function allForecasts(): Promise<IndustryForecastJson[]> {
  return Promise.all((await all()).map(toJson));
}

export async function forecastsBySlugs(slugs: string[]): Promise<IndustryForecastJson[]> {
  if (!slugs.length) return [];
  const rows = (await all()).filter((r) => slugs.includes(r.slug));
  return Promise.all(rows.map(toJson));
}

// Saves one row whole (checked by forecastProblem). The live handles and the
// snapshot are the row's own unless the input gives live.
export async function saveIndustryForecast(r: IndustryForecastInput, snapshot?: ForecastLine[]): Promise<void> {
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
export async function saveForecastSnapshot(slug: string, snapshot: ForecastLine[]): Promise<boolean> {
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
