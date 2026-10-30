// What the map's hazard layer draws: the tracks and extents of Disaster pins
// that start in a window (a storm's track from PinFlightPath, a flood's or
// wildfire's outline from PinSiteShape). One query, capped, so the layer never
// downloads the megabyte outlines a pin page streams.

import * as db from '../db';
import { simplifyForDisplay, type PinSiteShapeJson, type SiteFeature } from '@/lib/siteShape';

export type HazardShape =
  | { pinId: number; title: string; kind: 'track'; points: [number, number][] }
  | { pinId: number; title: string; kind: 'flood' | 'wildfire'; geometry: SiteFeature['geometry'] };

const LIMIT = 80;
// A layer outline is drawn a few hundred pixels wide; keep it light.
const POINT_BUDGET = 3000;

export async function hazardShapes(from: Date | null, to: Date | null): Promise<HazardShape[]> {
  const where = `EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Disaster' AND "t"."kind" = 'category')
    AND "p"."utcDeletedDateTime" IS NULL
    AND ($1::timestamptz IS NULL OR "p"."utcStartDateTime" >= $1) AND ($2::timestamptz IS NULL OR "p"."utcStartDateTime" <= $2)`;
  const [tracks, shapes] = await Promise.all([
    db.query<{ pinId: number; title: string; points: [number, number][] }>(
      `SELECT "p"."id" AS "pinId", "p"."title", "f"."points" FROM "Pin" AS "p" JOIN "PinFlightPath" AS "f" ON "f"."pinId" = "p"."id"
       WHERE ${where} ORDER BY "p"."utcStartDateTime" DESC LIMIT ${LIMIT}`,
      [from, to],
    ),
    db.query<{ pinId: number; title: string; geojson: PinSiteShapeJson['geojson'] }>(
      `SELECT "p"."id" AS "pinId", "p"."title", "s"."geojson" FROM "Pin" AS "p" JOIN "PinSiteShape" AS "s" ON "s"."pinId" = "p"."id"
       WHERE ${where} AND "s"."geojson"::text ~ '"kind": ?"(flood|wildfire)"' ORDER BY "p"."utcStartDateTime" DESC LIMIT ${LIMIT}`,
      [from, to],
    ),
  ]);
  const out: HazardShape[] = tracks.map((t) => ({ pinId: t.pinId, title: t.title, kind: 'track', points: t.points }));
  for (const s of shapes) {
    const simple = simplifyForDisplay({ geojson: s.geojson, source: '', sourceUrl: null }, POINT_BUDGET);
    for (const f of simple.geojson.features) {
      if (f.properties.kind === 'flood' || f.properties.kind === 'wildfire') out.push({ pinId: s.pinId, title: s.title, kind: f.properties.kind, geometry: f.geometry });
    }
  }
  return out;
}
