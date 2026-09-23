import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Comment from '@/server/model/comment';
import { TAGS } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/comment/[commentId]/vote'>;

// Up (1), down (-1) or take back (0) the viewer's vote on a comment. A vote
// is like a like: signing in is enough, no confirmed email. Answers with the
// comment's counts after it.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, commentId } = await ctx.params;
  const { value } = await readJson(request);
  if (value !== 1 && value !== -1 && value !== 0) {
    throw new HttpError(400, 'value must be 1, -1 or 0');
  }
  const result = await Comment.vote(intParam(id), intParam(commentId), user.id, value);
  if (!result) throw new HttpError(404, 'Comment not found');
  if (result === 'own') {
    throw new HttpError(403, 'You cannot vote on your own comment.', { code: 'ownComment', message: 'You cannot vote on your own comment.' });
  }
  // The pin page's comments are cached with their counts; only this pin's
  // page changes (the timeline and sitemap show no votes).
  revalidateTag(TAGS.pin(id), { expire: 0 });
  return json(result);
});
