// Threads an AI model line's releases and updates the way prequel.ts threads
// an anime's seasons: a pin answers the latest earlier pin from the same
// company about the same line at the same or an earlier version, so Claude
// Opus 4.6 follows 4.5, and each GPT-4o update follows the one before it.
// The line comes from the pin's title (src/lib/modelSeries.ts), which knows
// only the big model families, so the feature stays sparing: a pin is
// threaded only when it is clearly the next step of a product it shares with
// an earlier pin.

import { compareVersions, modelRelease, modelReleases, type ModelRelease } from '@/lib/modelSeries';
import * as db from '../db';
import { descendantIds, setParent } from './prequel';

export type SeriesPin = { id: number; title: string; parentId: number | null; utcStartDateTime: Date; company: string | null };

const PIN_SQL = `
    SELECT "Pin"."id", "Pin"."title", "Pin"."parentId", "Pin"."utcStartDateTime", "Company"."name" AS "company"
    FROM "Pin" LEFT JOIN "Company" ON "Company"."id" = "Pin"."companyId"
    WHERE "Pin"."utcDeletedDateTime" IS NULL`;

async function pinById(id: number): Promise<SeriesPin | undefined> {
  return (await db.query<SeriesPin>(`${PIN_SQL} AND "Pin"."id" = $1`, [id]))[0];
}

// A company's pins naming a model of one line, each with that model (the
// newest, when a title names more than one of the line).
async function linePins(company: string, line: string): Promise<(SeriesPin & { release: ModelRelease })[]> {
  const rows = await db.query<SeriesPin>(`${PIN_SQL} AND "Company"."name" = $1`, [company]);
  return rows.flatMap((row) => {
    const release = modelReleases(row.title)
      .filter((r) => r.line === line)
      .sort((a, b) => compareVersions(b.version, a.version))[0];
    return release ? [{ ...row, release }] : [];
  });
}

const time = (value: Date | string) => new Date(value).getTime();

// The pin this one follows in its model line: the latest earlier pin (same
// day counts, the lower id first) at the same or an earlier version.
// exclude: the pin itself and its replies.
export async function findSeriesPin(
  pin: { id?: number; title: string; company?: string | null; utcStartDateTime?: Date | string | null },
  exclude: number[] = [],
): Promise<SeriesPin | undefined> {
  const release = modelRelease(pin.title);
  if (!release || !pin.company) return undefined;
  const start = time(pin.utcStartDateTime || new Date());
  const skip = new Set([...exclude, ...(pin.id ? [pin.id] : [])]);
  const earlier = (await linePins(pin.company, release.line)).filter(
    (p) =>
      !skip.has(p.id) &&
      compareVersions(p.release.version, release.version) <= 0 &&
      (time(p.utcStartDateTime) < start || (time(p.utcStartDateTime) === start && pin.id != null && p.id < pin.id)),
  );
  return earlier.sort((a, b) => time(b.utcStartDateTime) - time(a.utcStartDateTime) || compareVersions(b.release.version, a.release.version) || b.id - a.id)[0];
}

// The parent a new pin's body left out, for POST /api/pins and the scrape.
export async function seriesPinFor(pin: { title?: string | null; company?: string | null; utcStartDateTime?: Date | string | null }) {
  if (!pin.title) return undefined;
  const found = await findSeriesPin({ title: pin.title, company: pin.company, utcStartDateTime: pin.utcStartDateTime });
  return found && { id: found.id, title: found.title };
}

// Where a pin belongs in its model line when that is not where it is, for a
// pin with no parent or one answering an earlier pin of the same line; a
// response to anything else was its author's choice (see suggestedSeriesParent).
async function betterSeriesParent(pin: SeriesPin): Promise<SeriesPin | undefined> {
  const best = await findSeriesPin(pin, await descendantIds(pin.id));
  if (!best || best.id === pin.parentId) return undefined;
  if (pin.parentId == null) return best;
  const parent = await pinById(pin.parentId);
  const line = modelRelease(pin.title)?.line;
  return parent && parent.company === pin.company && modelReleases(parent.title).some((r) => r.line === line) ? best : undefined;
}

// After a pin is saved: the later pins of its model line that should now
// answer it (Opus 4.7 answering 4.5 until 4.6 is pinned). Moves them and
// answers what moved.
export async function reslotSeries(pin: { id: number; title: string; company?: string | null }) {
  const release = modelRelease(pin.title);
  if (!release || !pin.company) return [];
  const moved: { id: number; from: number | null; to: number }[] = [];
  const line = (await linePins(pin.company, release.line)).sort((a, b) => time(a.utcStartDateTime) - time(b.utcStartDateTime) || a.id - b.id);
  for (const candidate of line) {
    if (candidate.id === pin.id) continue;
    const parent = await betterSeriesParent(candidate);
    if (!parent) continue;
    await setParent(candidate.id, parent.id);
    moved.push({ id: candidate.id, from: candidate.parentId, to: parent.id });
  }
  return moved;
}

// For the pin page's suggestion: where its model line would put a pin whose
// author placed it themselves.
export async function suggestedSeriesParent(pinId: number): Promise<{ pin: SeriesPin; parent: SeriesPin } | undefined> {
  const pin = await pinById(pinId);
  if (!pin) return undefined;
  const parent = await findSeriesPin(pin, await descendantIds(pin.id));
  return parent && parent.id !== pin.parentId ? { pin, parent } : undefined;
}
