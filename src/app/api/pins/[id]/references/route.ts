import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Pin from '@/server/model/pin';
import PinReference from '@/server/model/pinReference';
import { addReferences } from '@/server/services/addReferences';
import { MAX_ADDED_REFERENCES } from '@/lib/duplicateDraft';

type Ctx = RouteContext<'/api/pins/[id]/references'>;

// Adds references to a pin, for someone who found the event already pinned
// and brings their link to it instead of a duplicate. Any signed-in user may
// add, but only add: links the pin already has are skipped, nothing is edited
// or removed, and the pin's author is notified.
// POST /api/pins/:id/references {references: [{url, title, confidence, ...}]}
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const body = await readJson(request);
  if (!Array.isArray(body.references) || !body.references.length) {
    throw new HttpError(400, 'references must be a non-empty list');
  }
  if (body.references.length > MAX_ADDED_REFERENCES) {
    throw new HttpError(400, `At most ${MAX_ADDED_REFERENCES} references can be added at once.`);
  }
  // Only what a reference says about the page: its id, added time and adder are the server's.
  const candidates = body.references.map(
    ({ id: _id, utcCreatedDateTime: _added, addedByUserId: _by, addedByUserName: _name, addedByUserPictureUrl: _picture, ...r }: Record<string, unknown>) => r,
  );
  const problem = PinReference.problem(candidates);
  if (problem) {
    throw new HttpError(400, problem);
  }

  const result = await addReferences(pinId, candidates, user.id);
  if (!result) {
    throw new HttpError(404, 'Not Found');
  }
  if (!result.added.length) {
    return json({ added: 0, pin: result.pin });
  }
  const { pin: stored } = await Pin.queryById(pinId, user.id);
  return json({ added: result.added.length, pin: stored ?? result.pin }, 201);
});
