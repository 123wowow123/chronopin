import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { intParam, json, readJson, route } from '@/server/http';
import { applyAdTranslations, exportAdTranslations } from '@/server/services/sponsoredAdTranslationApi';

type Ctx = { params: Promise<{ id: string }> };
const headers = { 'Cache-Control': 'private, no-store' };

export const GET = route(async (request: NextRequest, { params }: Ctx) => {
  await requireRole('admin', request);
  return json(await exportAdTranslations(intParam((await params).id)), 200, headers);
});

export const POST = route(async (request: NextRequest, { params }: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await params).id);
  return json(await applyAdTranslations(id, await readJson(request)), 200, headers);
});
