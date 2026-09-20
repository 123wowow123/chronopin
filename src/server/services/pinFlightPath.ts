// A pin's flight path (0049): the line something travels from the pin's place.
// Scraped or computed, never typed into the pin form, so a pin update leaves
// it alone; saving replaces the pin's one path.

import * as db from '../db';

export type FlightPathInput = {
  label?: string | null;
  sourceUrl?: string | null;
  estimated?: boolean;
  // [latitude, longitude], in flight order.
  points: [number, number][];
};

export function flightPathProblem(path: FlightPathInput): string | undefined {
  const { points } = path;
  if (!Array.isArray(points) || points.length < 2 || points.length > 5000) {
    return 'A flight path needs between 2 and 5000 points.';
  }
  const bad = points.some(
    (p) => !Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 90,
  );
  return bad ? 'A flight path point must be [latitude, longitude] with latitude within +-90.' : undefined;
}

export async function saveFlightPath(pinId: number, path: FlightPathInput): Promise<void> {
  const problem = flightPathProblem(path);
  if (problem) throw new Error(problem);
  await db.query(
    `INSERT INTO "PinFlightPath" ("pinId", "label", "sourceUrl", "estimated", "points")
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT ("pinId") DO UPDATE SET
       "label" = EXCLUDED."label", "sourceUrl" = EXCLUDED."sourceUrl",
       "estimated" = EXCLUDED."estimated", "points" = EXCLUDED."points", "utcUpdatedDateTime" = now()`,
    [pinId, path.label?.slice(0, 200) || null, path.sourceUrl?.slice(0, 500) || null, path.estimated ?? true, JSON.stringify(path.points)],
  );
}

export type StoredFlightPath = FlightPathInput & { pinId: number };

// Every stored path, for the seed backup (scripts/data): the pins' own JSON
// leaves the view's copy out, as with tickers.
export function allFlightPaths(): Promise<StoredFlightPath[]> {
  return db.query<StoredFlightPath>(
    `SELECT "pinId", "label", "sourceUrl", "estimated", "points" FROM "PinFlightPath" ORDER BY "pinId"`,
  );
}

// Puts backed-up paths back, for pins that exist (ones the seed left out are skipped).
export async function restoreFlightPaths(paths: StoredFlightPath[]): Promise<void> {
  for (const { pinId, ...path } of paths) {
    const [pin] = await db.query(`SELECT 1 FROM "Pin" WHERE "id" = $1`, [pinId]);
    if (pin) await saveFlightPath(pinId, path);
  }
}
