import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { json, route } from '@/server/http';
import { checkTickerAlerts } from '@/server/services/tickerAlerts';

// Checks every reader's own tickers and sends the alerts due: the news job's
// call to production (tickerAlerts task). Admin only; safe to repeat.
export const POST = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await checkTickerAlerts());
});
