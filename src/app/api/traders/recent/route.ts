import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, route } from '@/server/http';
import PremiumSubscription from '@/server/model/premiumSubscription';
import TraderPosition from '@/server/model/traderPosition';
import { recentPositions } from '@/server/services/traders';

// Today's and yesterday's trader moves for the notification panel's Premium section.
// Premium readers (and admins) get the rows; anyone else gets only the
// locked flag. Per viewer, so never cached.
// GET /api/traders/recent?since=YYYY-MM-DD
export const GET = route(async (request: NextRequest) => {
  // The viewer's yesterday (their own calendar), so "today and yesterday" matches their day.
  const asked = request.nextUrl.searchParams.get('since') ?? '';
  const since = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : new Date(Date.now() - 36 * 3600_000).toISOString().slice(0, 10);
  const user = await getUser(request);
  if (!user) return json({ locked: true, signedIn: false, positions: [] });
  if (!(await PremiumSubscription.hasAccess(user))) return json({ locked: true, signedIn: true, positions: [] });
  const positions = await recentPositions(since, 50);
  return json({ locked: false, signedIn: true, positions });
});
