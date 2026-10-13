// Data for the /cars landing page: the best cars by the published car
// performance rubric (PinCarPerf, 0167), best first. Only the electric shelf
// (PinGasCarPerf, 0173) is the gasoline shelf's; each shelf is left out until it has cars.

import { cacheLife, cacheTag } from 'next/cache';
import * as db from '../db';
import Pins, { pinConfidenceOf } from '../model/pins';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { CAR_PERF_KEYS, CAR_PERF_RUBRIC_YEAR } from '@/lib/pinCarPerf';
import { GAS_CAR_PERF_KEYS, GAS_CAR_PERF_RUBRIC_YEAR } from '@/lib/pinGasCarPerf';
import { toJson, type PinJson } from '@/lib/types';
import { TAGS } from './cache';
import { timelineMinConfidence } from './timeline';
import { localizePins } from './translations';
import type { ProductPin, ProductShelf } from './products';

export const CARS_SHELF_SIZE = 24;
// Scores on fewer axes than this are not comparable with a full profile.
const MIN_AXES = 4;

type Rubric = { table: string; keys: readonly string[]; year: number; shelf: ProductShelf; source: string };
const RUBRICS: Rubric[] = [
  { table: 'PinCarPerf', keys: CAR_PERF_KEYS, year: CAR_PERF_RUBRIC_YEAR, shelf: { name: 'Electric Vehicles', label: 'Best electric cars', pins: [] }, source: 'car rubric' },
  { table: 'PinGasCarPerf', keys: GAS_CAR_PERF_KEYS, year: GAS_CAR_PERF_RUBRIC_YEAR, shelf: { name: 'Gasoline', label: 'Best gasoline cars', pins: [] }, source: 'gasoline car rubric' },
];

async function shelfFor(rubric: Rubric, minConfidence: number | null, locale: Locale): Promise<ProductShelf | null> {
  const sum = rubric.keys.map((k) => `COALESCE("cp"."${k}", 0)`).join(' + ');
  const count = rubric.keys.map((k) => `("cp"."${k}" IS NOT NULL)::int`).join(' + ');
  // One pin per model: a launch has a pin for each stage; the newest stands for it.
  const rows = await db.query<{ id: number; score: number; basis: string | null }>(
    `SELECT "id", "score", "basis" FROM (
       SELECT DISTINCT ON (lower(COALESCE(nullif("p"."productName", ''), "p"."title")))
         "p"."id", "p"."utcStartDateTime", "cp"."basis",
         round((((${sum})::numeric) / nullif(${count}, 0)), 2)::float8 AS "score"
       FROM "${rubric.table}" AS "cp" JOIN "Pin" AS "p" ON "p"."id" = "cp"."pinId"
       WHERE "p"."utcDeletedDateTime" IS NULL
         AND "cp"."rubricYear" = $1::integer
         AND (${count}) >= $2::integer
         AND ($3::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $3) >= $3)
       ORDER BY lower(COALESCE(nullif("p"."productName", ''), "p"."title")), "p"."utcStartDateTime" DESC, "p"."id" DESC
     ) AS "one" ORDER BY "score" DESC, "utcStartDateTime" DESC LIMIT $4::integer`,
    [rubric.year, MIN_AXES, minConfidence, CARS_SHELF_SIZE],
  );
  if (!rows.length) return null;
  const loaded = toJson<PinJson[]>((await Pins.queryByIds(rows.map((r) => r.id))).pins);
  await localizePins(loaded, locale);
  const byId = new Map(loaded.map((p) => [p.id, p]));
  const pins = rows.flatMap((r): ProductPin[] => {
    const pin = byId.get(r.id);
    return pin ? [{ ...pin, blurb: r.basis ?? undefined, rating: { score: r.score, max: 5, source: `ChronoPin ${rubric.year} ${rubric.source}`, url: null } }] : [];
  });
  return pins.length ? { ...rubric.shelf, pins } : null;
}

export async function carShelves(locale: Locale = DEFAULT_LOCALE): Promise<ProductShelf[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline, TAGS.sitemap);
  const minConfidence = await timelineMinConfidence();
  const shelves = await Promise.all(RUBRICS.map((rubric) => shelfFor(rubric, minConfidence, locale)));
  return shelves.filter((shelf): shelf is ProductShelf => !!shelf);
}
