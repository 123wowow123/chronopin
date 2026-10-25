import type { NextRequest } from 'next/server';
import * as db from '@/server/db';
import { recordAudit } from '@/server/adminDb';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { authorFor } from '@/server/services/adminPins';
import { invalidatePin } from '@/server/services/cache';

// Moves pins to another author (a curator desk, say), which the pin API
// cannot do. Body: { ids: number[] (1-200), userId? | userName? ("@AIDesk") }.
// Only Pin.userId changes; the audit log keeps the old author per pin, and the
// pages are expired. Answers { userId, updated: [{ id, from }], missing: [id] }.
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const { ids, userId, userName } = await readJson<{ ids?: unknown; userId?: unknown; userName?: unknown }>(request);
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    throw new HttpError(400, '', { message: 'ids must be 1-200 positive integers.' });
  }
  if ((userId == null || userId === '') && !(typeof userName === 'string' && userName.trim())) {
    throw new HttpError(400, '', { message: 'Expected userId or userName.' });
  }
  const author = await authorFor({ userId, userName }, admin);
  const rows = await db.query<{ id: number; from: number }>(
    `UPDATE "Pin" p SET "userId" = $2
       FROM (SELECT "id", "userId" AS "from" FROM "Pin" WHERE "id" = ANY($1::int[]) FOR UPDATE) o
      WHERE p."id" = o."id" AND o."from" IS DISTINCT FROM $2
      RETURNING p."id", o."from"`,
    [ids, author.id],
  );
  if (rows.length) {
    await recordAudit(
      admin.id,
      'Pin',
      rows.map((r) => ({ action: 'update', key: { id: r.id }, before: { userId: r.from }, after: { userId: author.id } })),
    );
    for (const r of rows) invalidatePin(r.id);
  }
  const touched = new Set(rows.map((r) => r.id));
  const existing = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "id" = ANY($1::int[])`, [ids]);
  const found = new Set(existing.map((r) => r.id));
  return json({
    userId: author.id,
    updated: rows.map((r) => ({ id: r.id, from: r.from })),
    unchanged: (ids as number[]).filter((id) => found.has(id) && !touched.has(id)),
    missing: (ids as number[]).filter((id) => !found.has(id)),
  });
});
