import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Comment, { COMMENT_REPORT_REASONS, type CommentReportReason } from '@/server/model/comment';

type Ctx = RouteContext<'/api/pins/[id]/comment/[commentId]/report'>;

// Reports a comment for an admin to look at (Admin > Reports), with why:
// { reason: 'spam' | 'harassment' | 'misleading' | 'other' }. Signing in is
// enough; nobody reports their own comment.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, commentId } = await ctx.params;
  const { reason } = await readJson(request);
  if (!COMMENT_REPORT_REASONS.includes(reason)) {
    throw new HttpError(400, `reason must be one of ${COMMENT_REPORT_REASONS.join(', ')}`);
  }
  const result = await Comment.report(intParam(id), intParam(commentId), user.id, reason as CommentReportReason);
  if (!result) throw new HttpError(404, 'Comment not found');
  if (result === 'own') {
    throw new HttpError(403, 'You cannot report your own comment.', { code: 'ownComment', message: 'You cannot report your own comment.' });
  }
  return json({ reported: true }, 201);
});
