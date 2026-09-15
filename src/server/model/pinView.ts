import * as db from '../db';

// Pin page views, counted once per viewer per UTC day (see 0014).
export default class PinView {
  // viewer: "u:<userId>" or "v:<anonymous visitor id>". Nothing is recorded
  // for a pin that does not exist or was deleted.
  static async record(pinId: number, viewer: string) {
    await db.query(
      `INSERT INTO "PinView" ("pinId", "viewer")
       SELECT "id", $2 FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL
       ON CONFLICT DO NOTHING`,
      [pinId, viewer],
    );
  }
}
