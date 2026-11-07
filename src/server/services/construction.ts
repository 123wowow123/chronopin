// Data for the /construction landing page: every build with a status tag, a
// sourced groundbreaking and a sourced completion, that is under way in a year.

import { cacheLife, cacheTag } from 'next/cache';
import * as db from '../db';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';
import { TAGS } from './cache';
import { localizePins } from './translations';

export type ConstructionStatus = 'Proposed' | 'In Progress' | 'Completed';
export type ConstructionBar = { id: number; title: string; href: string; start: string; end: string; status: ConstructionStatus; price: number | null; priceCurrency: string | null; city: string | null; country: string | null; thumbName: string | null; originalUrl: string | null };

export const CONSTRUCTION_ROW_LIMIT = 150;

// Builds whose span touches the year, longest-running first by start. A pin with
// real completion has no span to draw and is left out (an all-day pin's default end is
// start + 1 day, which is not a completion); Withdrawn builds are too.
export const CONSTRUCTION_YEARS = 10;

export async function constructionSpans(year: number, country: string | null, locale: Locale = DEFAULT_LOCALE): Promise<{ bars: ConstructionBar[]; total: number; undated: number }> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline);
  const rows = await db.query<Omit<ConstructionBar, 'href'> & { total: string }>(
    `SELECT p.id, p.title, p."utcStartDateTime"::text AS start, p."utcEndDateTime"::text AS "end", bt.name::text AS status,
            p.price::float8 AS price, p."priceCurrency", pp.city, pp.country, pm."thumbName", pm."originalUrl", count(*) OVER () AS total
     FROM "Pin" p
     JOIN "PinTag" bt ON bt."pinId" = p.id AND bt.name IN ('Proposed', 'In Progress', 'Completed')
     JOIN "PinAddressPlace" pp ON pp."pinId" = p.id
     LEFT JOIN LATERAL (SELECT m."thumbName", CASE WHEN m."type"::text = '1' THEN m."originalUrl" END AS "originalUrl"
                        FROM "PinMedium" x JOIN "Medium" m ON m.id = x."mediumId"
                        WHERE x."pinId" = p.id AND x."utcDeletedDateTime" IS NULL
                        ORDER BY (m."type"::text = '3') DESC, x.weight DESC, m.id LIMIT 1) pm ON true
     WHERE p."utcDeletedDateTime" IS NULL AND p."utcEndDateTime" - p."utcStartDateTime" > interval '1 day'
       AND p."utcStartDateTime" < make_timestamptz($1::int + ${CONSTRUCTION_YEARS}, 1, 1, 0, 0, 0, 'UTC')
       AND p."utcEndDateTime" >= make_timestamptz($1::int, 1, 1, 0, 0, 0, 'UTC')
       AND ($2::text IS NULL OR pp.country = $2)
     ORDER BY p."utcStartDateTime", p.id LIMIT ${CONSTRUCTION_ROW_LIMIT}`,
    [year, country],
  );
  const [{ n }] = await db.query<{ n: string }>(
    `SELECT count(*) AS n FROM "Pin" p
     JOIN "PinTag" bt ON bt."pinId" = p.id AND bt.name IN ('Proposed', 'In Progress')
     JOIN "PinAddressPlace" pp ON pp."pinId" = p.id
     WHERE p."utcDeletedDateTime" IS NULL AND ($1::text IS NULL OR pp.country = $1)
       AND (p."utcEndDateTime" IS NULL OR p."utcEndDateTime" - p."utcStartDateTime" <= interval '1 day')
       AND p."utcStartDateTime" < make_timestamptz($2::int + ${CONSTRUCTION_YEARS}, 1, 1, 0, 0, 0, 'UTC')
       AND COALESCE(p."utcEndDateTime", p."utcStartDateTime") >= make_timestamptz($2::int, 1, 1, 0, 0, 0, 'UTC')`,
    [country, year],
  );
  const pins = await localizePins(rows.map((r) => ({ ...r })), locale);
  return {
    total: Number(rows[0]?.total ?? 0),
    undated: Number(n),
    bars: pins.map(({ total: _total, ...r }) => ({ ...r, href: pinPath({ id: r.id, title: r.title, originalTitle: (r as { originalTitle?: string }).originalTitle }) })),
  };
}
