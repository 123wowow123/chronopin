// The news job's way of writing storm pins (stormTracks.ts): through the app's
// own API as the @QuakeDesk curator, on production when the run writes there,
// so a save reaches the live feed and search like any other pin. Reads find a
// pin by its EONET sourceUrl.

import * as db from '../db';
import { adminDbRequest, createPin, getPin, prodBase, saveFlightPathRow, updatePin } from './pinApi';
import type { StormTransport } from './stormTracks';

export const STORM_DESK = '@QuakeDesk';

async function pinIdBySource(sourceUrl: string): Promise<number | null> {
  if (prodBase()) {
    const found = await adminDbRequest<{ rows?: { id: number }[] }>('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(sourceUrl)}&utcDeletedDateTime.null=true&limit=2`);
    return found.rows?.length === 1 ? found.rows[0].id : null;
  }
  const rows = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL LIMIT 2`, [sourceUrl]);
  return rows.length === 1 ? rows[0].id : null;
}

export const jobStormTransport: StormTransport = {
  async find(sourceUrl) {
    const id = await pinIdBySource(sourceUrl);
    if (id == null) return null;
    const pin = await getPin(id);
    return { id, points: pin.flightPath?.points?.length ?? 0, end: pin.utcEndDateTime ?? null, media: (pin.media ?? []).map((m: { id?: number; originalUrl: string }) => ({ id: m.id, originalUrl: m.originalUrl })) };
  },
  async create(body) {
    return (await createPin(STORM_DESK, body)).id;
  },
  async update(id, { fields, addMedia, removeMediumIds }) {
    await updatePin(id, { ...fields, addMedia, removeMediumIds });
  },
  saveTrack: saveFlightPathRow,
};
