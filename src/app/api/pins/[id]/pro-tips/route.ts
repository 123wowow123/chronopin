import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { MAX_PRO_TIPS, type PinProTipJson } from '@/lib/pinProTip';
import { deleteProTips, proTipsForPin, saveProTips } from '@/server/model/pinProTip';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/pro-tips'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

const strOrNull = (val: unknown, maxLen: number): string | null => (typeof val === 'string' && val.trim() ? val.trim().slice(0, maxLen) : null);

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const tips = await proTipsForPin(intParam((await ctx.params).id));
  return tips.length ? json(tips) : noContent();
});

// PUT { tips: [{ tip, sourceUrl? }] } replaces the pin's whole list (at most MAX_PRO_TIPS).
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const b = await readJson(request);
  if (!Array.isArray(b.tips) || !b.tips.length) throw new HttpError(400, 'tips must be a non-empty array.');
  if (b.tips.length > MAX_PRO_TIPS) throw new HttpError(400, `At most ${MAX_PRO_TIPS} tips.`);
  const tips: PinProTipJson[] = b.tips.map((raw: Record<string, unknown>) => {
    const tip = strOrNull(raw?.tip, 500);
    if (!tip) throw new HttpError(400, 'Every tip needs text.');
    const sourceUrl = strOrNull(raw.sourceUrl, 4000);
    if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
    return { tip, sourceUrl };
  });
  await saveProTips(pinId, tips);
  invalidatePin(pinId);
  return json(await proTipsForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteProTips(pinId);
  invalidatePin(pinId);
  return noContent();
});
