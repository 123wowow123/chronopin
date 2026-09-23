'use server';

// Server Actions for read-your-own-writes. A route handler's revalidateTag is
// only applied after its response has gone (Next queues it as the request's
// pendingWaitUntil), so a page asked for the moment a PUT returns can still
// be served from the old cache: the author edits a title, lands on the new
// slug, and reads the old one. updateTag, which only a Server Action may
// call, expires the tag before the action returns, and clears the router's
// client cache as well.

import { updateTag } from 'next/cache';
import { getUser } from '@/server/auth';
import { TAGS } from './cache';

// After the author's own save, before they are sent to the pin. Signed-in
// only; expiring a page they could not have changed would only cost a render.
export async function expireSavedPin(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0 || !(await getUser())) return;
  updateTag(TAGS.pin(id));
}
