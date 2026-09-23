import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { intParam, json, route } from '@/server/http';
import Comment from '@/server/model/comment';

type Ctx = RouteContext<'/api/admin/comment-reports/[commentId]'>;

// Dismisses a comment's open reports: an admin looked, and it stays up.
// (Taking it down is the comment's own DELETE, which admins may use.)
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const dismissed = await Comment.dismissReports(intParam((await ctx.params).commentId), admin.id);
  return json({ dismissed });
});
