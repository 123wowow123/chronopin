import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import PinPhoto from '@/server/model/pinPhoto';
import { isCommentReaction } from '@/lib/commentReactions';

type Ctx = RouteContext<'/api/pins/[id]/photos/[photoId]/reaction'>;

// Sets the viewer's emoji reaction to a photo ({ reaction: 'like' | 'love' |
// 'haha' | 'wow' | 'sad' | 'angry' }) or takes it back ({ reaction: null }).
// Signing in is enough. Answers with the photo's counts after it.
// PUT /api/pins/:id/photos/:photoId/reaction
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, photoId } = await ctx.params;
  const { reaction } = await readJson(request);
  if (reaction !== null && !isCommentReaction(reaction)) {
    throw new HttpError(400, 'reaction must be like, love, haha, wow, sad, angry or null');
  }
  const result = await PinPhoto.react(intParam(photoId), intParam(id), user.id, reaction);
  if (!result) throw new HttpError(404, 'Not Found');
  return json(result);
});
