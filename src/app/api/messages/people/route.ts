import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Message from '@/server/model/message';

// Whom a new chat can go to, by a word of their handle. GET /api/messages/people?q=
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json({ people: await Message.people(user.id, request.nextUrl.searchParams.get('q') ?? '') });
});
