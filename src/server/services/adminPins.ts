// Pins an admin posts for other people - a curator desk, or anyone - through
// the same save as POST /api/pins (services/createPin.ts), so each is
// threaded, deduplicated, tagged and fed live under its author. Used by
// POST /api/admin/pins and POST /api/admin/db/Pin.

import { recordAudit } from '../adminDb';
import User from '../model/user';
import { HttpError } from '../util/httpError';
import { createPin } from './createPin';

export const MAX_ADMIN_PINS = 50;

export type AuthorRef = { userId?: unknown; userName?: unknown };
export type AdminPinResult = { index: number; id: number; userId: number } | { index: number; error: string };

// Who a pin is posted as: userId, or userName ("@GameDesk" or "GameDesk"),
// else the fallback (the admin, or a request-wide author).
export async function authorFor(ref: AuthorRef, fallback: User, known = new Map<string, User>()): Promise<User> {
  const { userId, userName } = ref;
  if (userId != null && userId !== '') {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, '', { message: `userId ${userId} is not an id` });
    if (id === fallback.id) return fallback;
    const key = `id:${id}`;
    if (!known.has(key)) {
      const { user } = await User.getById(id);
      if (!user) throw new HttpError(404, '', { message: `No user ${id}` });
      known.set(key, user);
    }
    return known.get(key)!;
  }
  if (typeof userName === 'string' && userName.trim()) {
    const handle = userName.trim();
    const key = `name:${handle.replace(/^@/, '').toLowerCase()}`;
    if (!known.has(key)) {
      // Handles are stored with or without the @; either spelling finds it.
      const bare = handle.replace(/^@/, '');
      const user = (await User.getUserByUserName(`@${bare}`)).user ?? (await User.getUserByUserName(bare)).user;
      if (!user) throw new HttpError(404, '', { message: `No user ${handle}` });
      known.set(key, user);
    }
    return known.get(key)!;
  }
  return fallback;
}

// Saves each pin in order as its author - its own userId/userName, else the
// request's, else the admin - and reports each one; a pin that fails (a
// duplicate source, an unknown author, a bad field) does not stop the rest.
// Each saved pin is also written to AdminAudit under the admin.
export async function createPinsAs(admin: User, bodies: unknown[], requestAuthor: AuthorRef = {}): Promise<AdminPinResult[]> {
  if (!bodies.length) throw new HttpError(400, '', { message: 'Expected at least one pin' });
  if (bodies.length > MAX_ADMIN_PINS) throw new HttpError(400, '', { message: `At most ${MAX_ADMIN_PINS} pins per request` });
  const known = new Map<string, User>();
  const fallback = await authorFor(requestAuthor, admin, known);
  const results: AdminPinResult[] = [];
  for (const [index, raw] of bodies.entries()) {
    try {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'Expected a pin object');
      const { userId, userName, ...body } = raw as Record<string, any>;
      const author = await authorFor({ userId, userName }, fallback, known);
      const saved = await createPin(body, author, { noBrowser: true });
      results.push({ index, id: saved.id, userId: author.id });
      await recordAudit(admin.id, 'Pin', [{ action: 'insert', key: { id: saved.id }, before: null, after: { id: saved.id, title: saved.title, userId: author.id } }]);
    } catch (err) {
      const message =
        err instanceof HttpError ? ((err.body as { message?: string } | undefined)?.message ?? err.message) : (err as Error).message;
      results.push({ index, error: message || 'Failed' });
    }
  }
  return results;
}
