import { after, type NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import Comment from '@/server/model/comment';
import type User from '@/server/model/user';
import { refreshSentiment } from '@/server/services/commentSentiment';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/comment/[commentId]'>;

// The comment, when it is on this pin and the signed-in user wrote it.
async function ownComment(user: User, ctx: Ctx): Promise<{ comment: Comment; pinId: number }> {
  const params = await ctx.params;
  const pinId = intParam(params.id);
  const { comment } = await Comment.queryById(intParam(params.commentId));
  if (!comment || Number(comment.pinId) !== pinId) {
    throw new HttpError(404, 'Comment not found');
  }
  if (Number(comment.userId) !== Number(user.id)) {
    throw new HttpError(403, 'Forbidden');
  }
  return { comment, pinId };
}

// Only the comment's author, and only within the edit window (5 minutes from
// posting) - enforced in the UPDATE itself, so it holds even if this check
// races a save.
export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    throw new HttpError(400, 'Comment text is required');
  }
  const { comment, pinId } = await ownComment(user, ctx);
  comment.text = text;
  const { updated } = await comment.update();
  if (!updated) {
    throw new HttpError(403, 'Comment can no longer be edited');
  }
  invalidatePin(pinId);
  after(() => refreshSentiment(comment.id));
  return json(comment);
});

// Marks the comment removed.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const { comment, pinId } = await ownComment(await requireUser(request), ctx);
  await comment.delete();
  invalidatePin(pinId);
  return noContent();
});
