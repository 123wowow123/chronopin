import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import { onlineUsers } from '@/server/liveFeed';
import Listing from '@/server/model/listing';
import Message, { MAX_MESSAGE_LENGTH } from '@/server/model/message';
import UserBlock from '@/server/model/userBlock';

type Ctx = RouteContext<'/api/messages/[userId]'>;

// The other side of the chat: a live user who is not the viewer.
async function other(ctx: Ctx, viewerId: number) {
  const id = intParam((await ctx.params).userId);
  if (id === viewerId) throw new HttpError(400, '', { message: 'you cannot message yourself' });
  const user = await Message.user(id);
  if (!user) throw new HttpError(404, 'Not Found');
  return user;
}

// The chat with a user, a page at a time, oldest first: ?before=<message id>
// for the page before. A block either way leaves it empty and closed.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser(request);
  const withUser = await other(ctx, viewer.id);
  const blocked = await UserBlock.between(viewer.id, withUser.id);
  const before = Number(request.nextUrl.searchParams.get('before')) || null;
  const thread = blocked
    ? { conversationId: null, messages: [], hasMore: false, otherLastReadMessageId: null }
    : await Message.thread(viewer.id, withUser.id, before);
  // The listings the chat is about, for its bar: the first page only, as
  // older pages are only more messages.
  const listings = thread.conversationId && !before ? await Listing.inChat(viewer.id, withUser.id, thread.conversationId) : [];
  return json({ with: withUser, online: onlineUsers([withUser.id]).has(withUser.id), blocked, ...thread, listings });
});

// Sends a message: { body, replyToId?, listingId? }. Like posting a comment,
// it needs a confirmed email, and a block either way refuses it. listingId
// asks the recipient about one of their listings still on offer.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser(request);
  requireVerifiedEmail(viewer);
  const withUser = await other(ctx, viewer.id);
  const { body, replyToId, listingId } = await readJson<{ body?: unknown; replyToId?: unknown; listingId?: unknown }>(request);
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) throw new HttpError(422, '', { message: 'a message needs some text' });
  if (text.length > MAX_MESSAGE_LENGTH) throw new HttpError(422, '', { message: `a message is at most ${MAX_MESSAGE_LENGTH} characters` });
  if (await UserBlock.between(viewer.id, withUser.id)) {
    throw new HttpError(403, '', { code: 'blocked', message: 'you cannot message this person' });
  }
  const replyTo = Number.isInteger(replyToId) && (replyToId as number) > 0 ? (replyToId as number) : null;
  const listing = Number.isInteger(listingId) && (listingId as number) > 0 ? (listingId as number) : null;
  if (listing && !(await Listing.askable(listing, viewer.id, withUser.id))) {
    throw new HttpError(422, '', { code: 'listing', message: 'that listing is not on offer from this person' });
  }
  return json({ message: await Message.send(viewer.id, withUser.id, text, replyTo, listing) }, 201);
});
