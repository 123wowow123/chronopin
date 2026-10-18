import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Pins from '@/server/model/pins';
import { findDuplicates } from '@/server/services/duplicatePin';

// The most existing pins the create form offers in place of a new one.
const MAX_MATCHES = 5;

// Pins a pin about to be posted would duplicate, so the form can offer adding
// to one of them instead: same source URL first, then the closest titles.
// GET /api/pins/duplicates?title=...&sourceUrl=...&start=ISO[&exclude=pinId]
// exclude is the pin being responded to, which a response is meant to resemble.
export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const query = request.nextUrl.searchParams;
  const start = new Date(query.get('start') ?? '');
  if (isNaN(start.getTime())) {
    throw new HttpError(400, 'start must be a date');
  }
  const exclude = Number(query.get('exclude')) || 0;

  const found = await findDuplicates({
    title: query.get('title'),
    sourceUrl: query.get('sourceUrl'),
    utcStartDateTime: start,
    dateConfidence: query.get('dateConfidence'),
  });
  found.delete(exclude);
  const ranked = [...found.entries()]
    .sort(([, a], [, b]) => Number(b.reason === 'sourceUrl') - Number(a.reason === 'sourceUrl') || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_MATCHES);
  if (!ranked.length) {
    return json([]);
  }

  const pins = new Map((await Pins.queryByIds(ranked.map(([id]) => id))).pins.map((pin) => [Number(pin.id), pin]));
  return json(ranked.filter(([id]) => pins.has(id)).map(([id, match]) => ({ ...match, pin: pins.get(id) })));
});
