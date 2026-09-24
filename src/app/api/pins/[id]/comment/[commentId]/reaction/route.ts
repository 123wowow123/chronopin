import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Comment from '@/server/model/comment';
import { TAGS } from '@/server/services/cache';
import { isCommentReaction } from '@/lib/commentReactions';

type Ctx = RouteContext<'/api/pins/[id]/comment/[commentId]/reaction'>;

// Sets the viewer's reaction to a comment ({ reaction: 'like' | 'love' | ...})
// or takes it back ({ reaction: null }). Like a like: signing in is enough, no
// confirmed email. Answers with the comment's counts after it.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const { id, commentId } = await ctx.params;
  const { reaction } = await readJson(request);
  if (reaction !== null && !isCommentReaction(reaction)) {
    throw new HttpError(400, 'reaction must be like, love, haha, wow, sad, angry or null');
  }
  const result = await Comment.react(intParam(id), intParam(commentId), user.id, reaction);
  if (!result) throw new HttpError(404, 'Comment not found');
  if (result === 'blocked') {
    throw new HttpError(403, 'You cannot react to this comment.', { code: 'blocked', message: 'You cannot react to this comment.' });
  }
  // The pin page's comments are cached with their counts; only this pin's
  // page changes (the timeline and sitemap show no reactions).
  revalidateTag(TAGS.pin(id), { expire: 0 });
  return json(result);
});
