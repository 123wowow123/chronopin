import type { NextRequest } from "next/server";
import { isAdmin, requireUser } from "@/server/auth";
import * as db from "@/server/db";
import {
  HttpError,
  intParam,
  json,
  noContent,
  readJson,
  route,
} from "@/server/http";
import {
  deleteSales,
  salesForPin,
  salesProblem,
  saveSales,
} from "@/server/model/pinSales";
import { expirePinPage } from "@/server/services/cache";

type Ctx = RouteContext<"/api/pins/[id]/sales">;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(
    `SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin) throw new HttpError(404, "Not Found");
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id))
    throw new HttpError(403, "Forbidden");
}

// The pin's published sales figures (src/lib/sales.ts), or 204 when none.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const rows = await salesForPin(intParam((await ctx.params).id));
  return rows.length ? json(rows) : noContent();
});

// Replaces the pin's figures: body { figures: [{ metric: 'units'|'revenue',
// value, currency (revenue only), asOf?, period?, scope?, sourceUrl, quote? }] }.
// Only figures a publisher or reliable report stated, each with its page.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const checked = salesProblem(await readJson(request));
  if (typeof checked === "string") throw new HttpError(400, checked);
  await saveSales(pinId, checked);
  expirePinPage(pinId);
  return json(await salesForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteSales(pinId);
  expirePinPage(pinId);
  return noContent();
});
