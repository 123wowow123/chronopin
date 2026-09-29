// The public data series a pin's event moves (PinSeries, 0062). Handles only:
// the numbers are fetched from the publisher on view (src/server/eiaSeries.ts),
// never stored, so a chart on a pin is always the publisher's current one.
//
// Like the flight path and the place, this is looked-up data rather than
// something typed into the pin form, so Pin#update() never touches it and
// editing a pin cannot wipe it. It is attached by a scrape or a script.

import * as db from '../db';
import { normaliseSeriesId, seriesUrl } from '../eiaSeries';

export type PinSeriesInput = {
  source?: string;
  seriesId: string;
  label?: string | null;
  sourceUrl?: string | null;
};

export type PinSeriesRow = {
  source: string;
  seriesId: string;
  label: string | null;
  sourceUrl: string | null;
};

const SOURCES = new Set(['eia']);

export function seriesProblem(input: PinSeriesInput): string | undefined {
  const source = input.source ?? 'eia';
  if (!SOURCES.has(source)) {
    return `A series source must be one of: ${[...SOURCES].join(', ')}.`;
  }
  if (!input.seriesId?.trim() || input.seriesId.trim().length > 64) {
    return 'A series needs a publisher series id of up to 64 characters.';
  }
  return undefined;
}

// Adds a series to a pin, or updates the label and URL of one it already has.
export async function saveSeries(pinId: number, input: PinSeriesInput): Promise<void> {
  const problem = seriesProblem(input);
  if (problem) throw new Error(problem);
  const source = input.source ?? 'eia';
  const seriesId = normaliseSeriesId(input.seriesId);
  await db.query(
    `INSERT INTO "PinSeries" ("pinId", "source", "seriesId", "label", "sourceUrl")
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ("pinId", "source", "seriesId") DO UPDATE
       SET "label" = EXCLUDED."label", "sourceUrl" = EXCLUDED."sourceUrl"`,
    [pinId, source, seriesId, input.label ?? null, input.sourceUrl ?? null],
  );
}

export async function removeSeries(pinId: number, seriesId: string, source = 'eia'): Promise<void> {
  await db.query(`DELETE FROM "PinSeries" WHERE "pinId" = $1 AND "source" = $2 AND "seriesId" = $3`, [
    pinId,
    source,
    normaliseSeriesId(seriesId),
  ]);
}

export async function seriesForPin(pinId: number): Promise<PinSeriesRow[]> {
  return db.query<PinSeriesRow>(
    `SELECT "source", "seriesId", "label", "sourceUrl" FROM "PinSeries" WHERE "pinId" = $1 ORDER BY "id"`,
    [pinId],
  );
}

// Where a reader clicks through to: what the curator stored, else the
// publisher's own page for the series.
export const linkFor = (row: PinSeriesRow): string => row.sourceUrl || seriesUrl(row.seriesId);

// Every pin's series, for the seed backup, and the restore that puts them
// back. A greenfield refresh rebuilds the database from the schema and the
// seeds, so a series that is not in seedSeries.json is a chart that quietly
// disappears from a pin after db:refresh.
export async function allSeries(): Promise<(PinSeriesRow & { pinId: number })[]> {
  return db.query(
    `SELECT "pinId", "source", "seriesId", "label", "sourceUrl" FROM "PinSeries" ORDER BY "pinId", "id"`,
  );
}

export async function restoreSeries(rows: (PinSeriesRow & { pinId: number })[]): Promise<void> {
  for (const row of rows) {
    await saveSeries(row.pinId, row);
  }
}
