import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Comment, { COMMENT_HIDE_REPORTS, COMMENT_REPORT_REASONS, type CommentReportReason } from '@/server/model/comment';
import { TAGS } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/comment/[commentId]/report'>;

// Reports a comment for an admin to look at (Admin > Comments), with why:
// { reason: 'spam' | 'harassment' | 'misleading' | 'other' }. Signing in is
// enough, and any comment may be reported, the reader's own included. At
// COMMENT_HIDE_REPORTS open reports the comment is hidden from readers, so the
// pin page's cached comments are read again.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, commentId } = await ctx.params;
  const { reason } = await readJson(request);
  if (!COMMENT_REPORT_REASONS.includes(reason)) {
    throw new HttpError(400, `reason must be one of ${COMMENT_REPORT_REASONS.join(', ')}`);
  }
  const result = await Comment.report(intParam(id), intParam(commentId), user.id, reason as CommentReportReason);
  if (!result) throw new HttpError(404, 'Comment not found');
  if ((await Comment.openReportCount(intParam(commentId))) >= COMMENT_HIDE_REPORTS) {
    revalidateTag(TAGS.pin(id), { expire: 0 });
  }
  return json({ reported: true }, 201);
});
