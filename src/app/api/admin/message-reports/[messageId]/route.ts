import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { intParam, json, route } from '@/server/http';
import Message from '@/server/model/message';

type Ctx = RouteContext<'/api/admin/message-reports/[messageId]'>;

// Dismisses a message's open reports: an admin looked at it.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  return json({ dismissed: await Message.dismissReports(intParam((await ctx.params).messageId), admin.id) });
});
