import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import Notification from '@/server/model/notification';

// Recent stock-trade filings for visitors who are not signed in, in the same
// shape as a watcher's 'trade' notifications. GET /api/trades/recent[?days=3]
// (up to 84, the history page's twelve weeks).
export const GET = route(async (request: NextRequest) => {
  const days = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('days') ?? '', 10) || 3, 1), 84);
  return json({ notifications: await Notification.listPublicTrades(days) });
});
