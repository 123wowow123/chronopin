// Data for the /construction landing page: every build with a status tag, a
// sourced groundbreaking and a sourced completion, that is under way in a year.

import { cacheLife, cacheTag } from 'next/cache';
import * as db from '../db';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { pinPath } from '@/lib/seo';
import { TAGS } from './cache';
import { localizePins } from './translations';

import { CONSTRUCTION_PAD_YEARS, CONSTRUCTION_YEARS, type ConstructionBar } from '@/lib/construction';
export type { ConstructionBar, ConstructionStatus } from '@/lib/construction';

export { CONSTRUCTION_YEARS };
const CHART_YEARS = CONSTRUCTION_YEARS + 2 * CONSTRUCTION_PAD_YEARS;
export const CONSTRUCTION_ROW_LIMIT = 150;

// Builds whose span touches the year, longest-running first by start. A pin with
// real completion has no span to draw and is left out (an all-day pin's default end is
// start + 1 day, which is not a completion); Withdrawn builds are too.
export async function constructionSpans(year: number, country: string | null, locale: Locale = DEFAULT_LOCALE): Promise<{ bars: ConstructionBar[]; total: number; undated: number }> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline);
  year -= CONSTRUCTION_PAD_YEARS;
  const rows = await db.query<Omit<ConstructionBar, 'href'> & { total: string }>(
    `SELECT p.id, p.title, p."utcStartDateTime"::text AS start, p."utcEndDateTime"::text AS "end", bt.name::text AS status,
            p.price::float8 AS price, p."priceCurrency", pp.city, pp.country, pm."thumbName", pm."originalUrl",
            CASE WHEN EXISTS (SELECT 1 FROM "PinDatacenter" d WHERE d."pinId" = p.id) OR fp.sector ~* 'data cent' THEN 'datacenter'
                 WHEN EXISTS (SELECT 1 FROM "PinPower" w WHERE w."pinId" = p.id) OR p.title ~* '((^|[^a-z])wind([^a-z]|$)|offshore wind|wind farm|solar|battery storage|nuclear|reactor)' OR EXISTS (SELECT 1 FROM "PinTag" c WHERE c."pinId" = p.id AND c.name IN ('Solar', 'BESS', 'EnergyStorage')) THEN 'power'
                 WHEN fp.sector ~* '(^|[^a-z])(rail|road|roads|transit|aviation|ports?|transport|highway|airport|subway|tunnel)([^a-z]|$)' OR EXISTS (SELECT 1 FROM "PinTag" c WHERE c."pinId" = p.id AND c.name IN ('Transport', 'Marine')) THEN 'transport'
                 WHEN fp.sector ~* '(residential|housing|apartment)' OR p.title ~* '(apartment|housing|homes|residen|affordable|senior living)' OR EXISTS (SELECT 1 FROM "PinTag" c WHERE c."pinId" = p.id AND c.name = 'Property') THEN 'housing'
                 WHEN fp.sector ~* '(manufactur|semiconductor|fab|factory|assembly)' OR EXISTS (SELECT 1 FROM "PinTag" c WHERE c."pinId" = p.id AND c.name IN ('Semiconductors', 'Manufacturing')) THEN 'factory'
                 WHEN fp.sector IS NOT NULL OR EXISTS (SELECT 1 FROM "PinTag" c WHERE c."pinId" = p.id AND c.name = 'Architecture') THEN 'buildings'
                 ELSE 'other' END AS sector,
            (SELECT c.name::text FROM "PinTag" c WHERE c."pinId" = p.id AND c.kind = 'category'
               AND c.name NOT IN ('Infrastructure', 'Architecture', 'Business', 'Labour', 'Policy', 'Climate') ORDER BY c.name LIMIT 1) AS category,
            (SELECT w.megawatts::float8 FROM "PinPower" w WHERE w."pinId" = p.id) AS megawatts,
            (SELECT w.kind FROM "PinPower" w WHERE w."pinId" = p.id) AS "powerKind", count(*) OVER () AS total
     FROM "Pin" p
     JOIN "PinTag" bt ON bt."pinId" = p.id AND bt.name IN ('Proposed', 'In Progress', 'Completed')
     JOIN "PinAddressPlace" pp ON pp."pinId" = p.id
     LEFT JOIN LATERAL (SELECT f.profile->>'sector' AS sector FROM "PinFactory" f WHERE f."pinId" = p.id) fp ON true
     LEFT JOIN LATERAL (SELECT m."thumbName", CASE WHEN m."type"::text = '1' THEN m."originalUrl" END AS "originalUrl"
                        FROM "PinMedium" x JOIN "Medium" m ON m.id = x."mediumId"
                        WHERE x."pinId" = p.id AND x."utcDeletedDateTime" IS NULL
                        ORDER BY (m."type"::text = '3') DESC, x.weight DESC, m.id LIMIT 1) pm ON true
     WHERE p."utcDeletedDateTime" IS NULL AND p."utcEndDateTime" - p."utcStartDateTime" > interval '1 day'
       AND p."utcStartDateTime" < make_timestamptz($1::int + ${CHART_YEARS}, 1, 1, 0, 0, 0, 'UTC')
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
       AND p."utcStartDateTime" < make_timestamptz($2::int + ${CHART_YEARS}, 1, 1, 0, 0, 0, 'UTC')
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
