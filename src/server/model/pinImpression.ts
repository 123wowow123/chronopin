import * as db from '../db';

// Timeline impressions, counted once per viewer per UTC day (see 0024).
export default class PinImpression {
  // viewer: as for PinView.record. Ids of pins that do not exist or were
  // deleted are skipped.
  static async record(pinIds: number[], viewer: string) {
    if (!pinIds.length) return;
    await db.query(
      `INSERT INTO "PinImpression" ("pinId", "viewer")
       SELECT "id", $2 FROM "Pin" WHERE "id" = ANY($1::integer[]) AND "utcDeletedDateTime" IS NULL
       ON CONFLICT DO NOTHING`,
      [pinIds, viewer],
    );
  }
}
