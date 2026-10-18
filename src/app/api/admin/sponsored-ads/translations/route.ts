import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { pendingAdTranslations } from '@/server/services/sponsoredAdTranslationApi';

export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 25);
  const after = Number(request.nextUrl.searchParams.get('after') ?? 0);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 25 || !Number.isSafeInteger(after) || after < 0) throw new HttpError(400, 'limit must be 1–25 and after a non-negative integer.');
  return json(await pendingAdTranslations(limit, after), 200, { 'Cache-Control': 'private, no-store' });
});
