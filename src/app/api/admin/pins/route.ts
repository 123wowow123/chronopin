import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { createPinsAs } from '@/server/services/adminPins';

// Pins posted by an admin, for a curator desk, another user or in bulk, so a
// session that can reach the site with an admin token needs neither the
// desk's own login nor its email confirmed by SQL.
//
//   POST { userId? | userName?, pins: [{ title, ..., userId? | userName? }, ...] }
//        each pin is a POST /api/pins body (services/createPin.ts), authored
//        by its own userId or userName ("@GameDesk"), else the request's,
//        else the admin, and saved in order, one at a time. A pin that fails
//        (a duplicate source, an unknown author, a bad field) is reported and
//        the rest still post: { results: [{ index, id, userId } | { index, error }] }
//        with 201 when every pin saved, else 207.
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const { userId, userName, pins } = await readJson<{ userId?: number; userName?: string; pins?: unknown[] }>(request);
  if (!Array.isArray(pins) || !pins.length) {
    throw new HttpError(400, '', { message: 'Expected { pins: [...] }' });
  }
  const results = await createPinsAs(admin, pins, { userId, userName });
  return json({ results }, results.every((r) => 'id' in r) ? 201 : 207);
});
