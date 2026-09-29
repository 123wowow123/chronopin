import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, noContent, readJson, route } from '@/server/http';
import Message, { MESSAGE_REPORT_REASONS, type MessageReportReason } from '@/server/model/message';

type Ctx = RouteContext<'/api/messages/[userId]/[messageId]/report'>;

// Reports the other side's message for an admin to review: { reason }.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser(request);
  const { reason } = await readJson<{ reason?: unknown }>(request);
  if (!MESSAGE_REPORT_REASONS.includes(reason as MessageReportReason)) {
    throw new HttpError(422, '', { message: `reason must be one of ${MESSAGE_REPORT_REASONS.join(', ')}` });
  }
  const { userId, messageId } = await ctx.params;
  if (!(await Message.report(viewer.id, intParam(userId), intParam(messageId), reason as MessageReportReason))) {
    throw new HttpError(404, 'Not Found');
  }
  return noContent(201);
});
