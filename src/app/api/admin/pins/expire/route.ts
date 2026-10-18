import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { invalidatePin } from '@/server/services/cache';

// Drops the cached page, event info and other cached reads of the given pins
// at once, so the next view renders from the database. Body: { ids: number[] }
// (at most 200). For a change made straight in the database, or a page that
// went on showing an old reading after a save.
export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const body = await readJson(request);
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    throw new HttpError(400, '', { message: 'ids must be 1-200 positive integers.' });
  }
  for (const id of ids as number[]) {
    invalidatePin(id);
  }
  return json({ expired: ids });
});
