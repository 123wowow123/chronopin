import type { NextRequest } from "next/server";
import { isAdmin, requireUser } from "@/server/auth";
import * as db from "@/server/db";
import { HttpError, intParam, json, readJson, route } from "@/server/http";
import { outcomePhotosForPin, photosProblem, savePhotosPartial } from "@/server/model/pinOutcomePhoto";
import { expirePinPage } from "@/server/services/cache";

type Ctx = RouteContext<"/api/pins/[id]/outcome-photos">;

// The pictures of the people behind a market pin's outcomes (0268).
export const GET = route(async (_request: NextRequest, ctx: Ctx) => json(await outcomePhotosForPin(intParam((await ctx.params).id))));

// Adds or replaces pictures: body { photos: [{ label, person, imageSource |
// imageUrl, authorName, authorUrl }] }. imageSource is downloaded, cropped and
// stored; imageUrl must already be in our storage. Author or admin.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, "Not Found");
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, "Forbidden");
  const body = (await readJson(request)) as { photos?: unknown };
  const rows = photosProblem(body?.photos);
  if (typeof rows === "string") throw new HttpError(400, rows);
  // Pictures that could not be fetched are left out (the caller reads the list
  // back and sees which labels are missing); only a batch with none saved fails.
  const { saved, failed } = await savePhotosPartial(pinId, rows);
  if (!saved.length && failed.length) throw new HttpError(422, failed[0].reason);
  expirePinPage(pinId);
  return json(await outcomePhotosForPin(pinId));
});
