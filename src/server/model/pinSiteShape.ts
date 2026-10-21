// A pin's mapped site outlines (PinSiteShape, 0203). One row per pin.

import * as db from '../db';
import type { PinSiteShapeJson } from '@/lib/siteShape';

export async function siteShapeForPin(pinId: number): Promise<PinSiteShapeJson | null> {
  const [row] = await db.query<{ geojson: PinSiteShapeJson['geojson']; source: string; sourceUrl: string | null }>(
    `SELECT "geojson", "source", "sourceUrl" FROM "PinSiteShape" WHERE "pinId" = $1`,
    [pinId],
  );
  return row ? { geojson: row.geojson, source: row.source, sourceUrl: row.sourceUrl ?? null } : null;
}

export async function saveSiteShape(pinId: number, input: PinSiteShapeJson) {
  await db.query(
    `INSERT INTO "PinSiteShape" ("pinId", "geojson", "source", "sourceUrl", "checkedAt")
     VALUES ($1, $2::jsonb, $3, $4, now())
     ON CONFLICT ("pinId") DO UPDATE SET "geojson" = $2::jsonb, "source" = $3, "sourceUrl" = $4, "checkedAt" = now()`,
    [pinId, JSON.stringify(input.geojson), input.source, input.sourceUrl],
  );
}

export async function deleteSiteShape(pinId: number) {
  await db.query(`DELETE FROM "PinSiteShape" WHERE "pinId" = $1`, [pinId]);
}

