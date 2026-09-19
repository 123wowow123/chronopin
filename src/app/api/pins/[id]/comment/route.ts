import { after, type NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Comment from '@/server/model/comment';
import Pin from '@/server/model/pin';
import UserWiki from '@/server/model/userWiki';
import { refreshSentiment } from '@/server/services/commentSentiment';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/comment'>;

// Root comments are depth 0; a reply to a root is depth 1, a reply to that is
// depth 2 - three levels in all. A reply that would land at depth 3 is refused.
const MAX_REPLY_DEPTH = 2;

async function commentDepth(comment: Comment): Promise<number> {
  if (!comment.parentCommentId) {
    return 0;
  }
  const { comment: parent } = await Comment.queryById(comment.parentCommentId);
  return parent ? (await commentDepth(parent)) + 1 : 0;
}

export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  return json(await Comment.getByPinId(pinId));
});

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const body = await readJson(request);
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const parentCommentId = body.parentCommentId ? Number(body.parentCommentId) : null;

  if (!text) {
    throw new HttpError(400, 'Comment text is required');
  }

  let parent: Comment | undefined;
  if (parentCommentId) {
    ({ comment: parent } = await Comment.queryById(parentCommentId));
    if (!parent || Number(parent.pinId) !== pinId) {
      throw new HttpError(404, 'Parent comment not found');
    }
    if ((await commentDepth(parent)) + 1 > MAX_REPLY_DEPTH) {
      throw new HttpError(400, 'Maximum reply depth reached');
    }
  }

  // Also notifies the pin's author and, for a reply, the parent comment's author.
  const { comment } = await new Comment({ text, parentCommentId }, user, new Pin({ id: pinId })).post(parent);
  if (!comment) {
    throw new HttpError(404, 'Pin not found');
  }
  invalidatePin(pinId);
  after(() => refreshSentiment(comment.id));
  after(() => UserWiki.rebuildQuietly(user.id));
  return json(comment, 201);
});
