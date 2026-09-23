import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import { HttpError, intParam, noContent, route } from '@/server/http';
import Comment from '@/server/model/comment';
import type User from '@/server/model/user';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/comment/[commentId]'>;

// The comment, when it is on this pin and the signed-in user wrote it - or is
// an admin, who may take down anyone's (Admin > Comments, and the comment's
// menu). The comment keeps its author, so the delete still names them.
async function deletableComment(user: User, ctx: Ctx): Promise<{ comment: Comment; pinId: number }> {
  const params = await ctx.params;
  const pinId = intParam(params.id);
  const { comment } = await Comment.queryById(intParam(params.commentId));
  if (!comment || Number(comment.pinId) !== pinId) {
    throw new HttpError(404, 'Comment not found');
  }
  if (Number(comment.userId) !== Number(user.id) && !isAdmin(user)) {
    throw new HttpError(403, 'Forbidden');
  }
  return { comment, pinId };
}

// Comments are never edited (the author may only delete one), so there is
// no PATCH.

// Marks the comment removed.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const { comment, pinId } = await deletableComment(await requireUser(request), ctx);
  await comment.delete();
  invalidatePin(pinId);
  return noContent();
});
