// The public data series a pin's event moves (PinSeries, 0062). Handles only:
// the numbers are fetched from the publisher on view (src/server/eiaSeries.ts),
// never stored, so a chart on a pin is always the publisher's current one.
//
// Like the flight path and the place, this is looked-up data rather than
// something typed into the pin form, so Pin#update() never touches it and
// editing a pin cannot wipe it. It is attached by a scrape or a script.

import * as db from '../db';
import { getSeries, normaliseSeriesId, seriesUrl, type EiaSeries } from '../eiaSeries';
import { fredUrl, getFredSeries, parseFredId, type FredSeries } from '../fredSeries';
import { epochUrl, getEpochSeries, parseEpochId, type EpochSeries } from '../epochSeries';
import { getOrnnSeries, ornnUrl, parseOrnnId, type OrnnSeries } from '../ornnSeries';

export type PinSeriesInput = {
  source?: string;
  seriesId: string;
  label?: string | null;
  sourceUrl?: string | null;
  // The observation to mark, as a day key, when the pin's date would pick the wrong one.
  markedDay?: string | null;
};

export type PinSeriesRow = {
  source: string;
  seriesId: string;
  label: string | null;
  sourceUrl: string | null;
  markedDay: string | null;
};

const SOURCES = new Set(['eia', 'fred', 'epoch', 'ornn']);

export function seriesProblem(input: PinSeriesInput): string | undefined {
  const source = input.source ?? 'eia';
  if (!SOURCES.has(source)) {
    return `A series source must be one of: ${[...SOURCES].join(', ')}.`;
  }
  if (!input.seriesId?.trim() || input.seriesId.trim().length > 64) {
    return 'A series needs a publisher series id of up to 64 characters.';
  }
  if (source === 'fred' && !parseFredId(input.seriesId)) {
    return 'A FRED series id is the id and an optional units code, like PCEPI or PCEPI:PC1.';
  }
  if (source === 'epoch' && !parseEpochId(input.seriesId)) {
    return 'An Epoch series id is the campus slug and a metric, like meta-los-lunas:it (metric it, h100e or cost).';
  }
  if (source === 'ornn' && !parseOrnnId(input.seriesId)) {
    return 'An Ornn series id is the GPU name as Ornn spells it, like "H100 SXM" or "B200".';
  }
  if (input.markedDay && !/^\d{4}-\d{2}-\d{2}$/.test(input.markedDay)) {
    return 'A marked day must be YYYY-MM-DD.';
  }
  return undefined;
}

// The stored spelling of a handle: Epoch's slugs are lower case, Ornn's GPU
// names keep their spaces, the rest are upper-case ids.
export function normaliseFor(source: string, seriesId: string): string {
  if (source === 'epoch') return seriesId.trim().toLowerCase();
  if (source === 'ornn') return parseOrnnId(seriesId) ?? seriesId.trim();
  return normaliseSeriesId(seriesId);
}

// Adds a series to a pin, or updates the label and URL of one it already has.
export async function saveSeries(pinId: number, input: PinSeriesInput): Promise<void> {
  const problem = seriesProblem(input);
  if (problem) throw new Error(problem);
  const source = input.source ?? 'eia';
  const seriesId = normaliseFor(source, input.seriesId);
  await db.query(
    `INSERT INTO "PinSeries" ("pinId", "source", "seriesId", "label", "sourceUrl", "markedDay")
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT ("pinId", "source", "seriesId") DO UPDATE
       SET "label" = EXCLUDED."label", "sourceUrl" = EXCLUDED."sourceUrl", "markedDay" = EXCLUDED."markedDay"`,
    [pinId, source, seriesId, input.label ?? null, input.sourceUrl ?? null, input.markedDay ?? null],
  );
}

export async function removeSeries(pinId: number, seriesId: string, source = 'eia'): Promise<void> {
  const id = normaliseFor(source, seriesId);
  await db.query(`DELETE FROM "PinSeries" WHERE "pinId" = $1 AND "source" = $2 AND "seriesId" = $3`, [
    pinId,
    source,
    id,
  ]);
}

export async function seriesForPin(pinId: number): Promise<PinSeriesRow[]> {
  return db.query<PinSeriesRow>(
    `SELECT "source", "seriesId", "label", "sourceUrl", to_char("markedDay", 'YYYY-MM-DD') AS "markedDay" FROM "PinSeries" WHERE "pinId" = $1 ORDER BY "id"`,
    [pinId],
  );
}

// The publisher's current numbers for a stored handle, whoever publishes it.
export function readSeries(source: string, seriesId: string): Promise<EiaSeries | FredSeries | EpochSeries | OrnnSeries | null> {
  if (source === 'ornn') return getOrnnSeries(seriesId);
  if (source === 'epoch') return getEpochSeries(seriesId);
  return source === 'fred' ? getFredSeries(seriesId) : getSeries(seriesId);
}

// Where a reader clicks through to: what the curator stored, else the
// publisher's own page for the series.
export const linkFor = (row: PinSeriesRow): string =>
  row.sourceUrl || (row.source === 'ornn' ? ornnUrl(row.seriesId) : row.source === 'epoch' ? epochUrl(row.seriesId) : row.source === 'fred' ? fredUrl(row.seriesId) : seriesUrl(row.seriesId));

// Every pin's series, for the seed backup, and the restore that puts them
// back. A greenfield refresh rebuilds the database from the schema and the
// seeds, so a series that is not in seedSeries.json is a chart that quietly
// disappears from a pin after db:refresh.
export async function allSeries(): Promise<(PinSeriesRow & { pinId: number })[]> {
  return db.query(
    `SELECT "pinId", "source", "seriesId", "label", "sourceUrl", to_char("markedDay", 'YYYY-MM-DD') AS "markedDay" FROM "PinSeries" ORDER BY "pinId", "id"`,
  );
}

export async function restoreSeries(rows: (PinSeriesRow & { pinId: number })[]): Promise<void> {
  for (const row of rows) {
    await saveSeries(row.pinId, row);
  }
}
