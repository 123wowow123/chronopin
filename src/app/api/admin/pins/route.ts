import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import User from '@/server/model/user';
import { createPin } from '@/server/services/createPin';

// Pins posted by an admin, for a curator desk or in bulk, so a session that
// can reach the site with an admin token needs neither the desk's own login
// nor its email confirmed by SQL.
//
//   POST { userId?, pins: [{ title, ... }, ...] }
//        each pin is a POST /api/pins body (services/createPin.ts), authored
//        by userId (default: the admin), and saved in order, one at a time.
//        A pin that fails (a duplicate source, a bad field) is reported and
//        the rest still post: { results: [{ index, id } | { index, error }] }
//        with 201 when every pin saved, else 207.
const MAX_PINS = 50;

export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const { userId, pins } = await readJson<{ userId?: number; pins?: Record<string, any>[] }>(request);
  if (!Array.isArray(pins) || !pins.length) {
    throw new HttpError(400, '', { message: 'Expected { pins: [...] }' });
  }
  if (pins.length > MAX_PINS) {
    throw new HttpError(400, '', { message: `At most ${MAX_PINS} pins per request` });
  }
  let author = admin;
  if (userId !== undefined && userId !== admin.id) {
    const { user } = await User.getById(Number(userId));
    if (!user) throw new HttpError(404, '', { message: `No user ${userId}` });
    author = user;
  }

  const results: ({ index: number; id: number } | { index: number; error: string })[] = [];
  for (const [index, body] of pins.entries()) {
    try {
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Expected a pin object');
      const saved = await createPin(body, author);
      results.push({ index, id: saved.id });
    } catch (err) {
      const e = err as HttpError;
      const message =
        e instanceof HttpError ? ((e.body as { message?: string } | undefined)?.message ?? e.message) : (err as Error).message;
      results.push({ index, error: message || 'Failed' });
    }
  }
  return json({ results }, results.every((r) => 'id' in r) ? 201 : 207);
});
