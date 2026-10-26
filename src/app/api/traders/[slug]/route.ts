import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, route } from '@/server/http';
import PremiumSubscription from '@/server/model/premiumSubscription';
import TraderPosition from '@/server/model/traderPosition';
import { positionsWithPnl } from '@/server/services/traders';
import { averagePnl } from '@/lib/traders';

// A trader's disclosed positions with their estimated PnL. Premium readers
// (and admins) get the rows; everyone else gets only how many there are, so
// the page can say what premium unlocks. Per viewer, so never cached.
export const GET = route(async (request: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const user = await getUser(request);
  if (!user || !(await PremiumSubscription.hasAccess(user))) {
    return json({ locked: true, count: await TraderPosition.count(slug) });
  }
  const positions = await positionsWithPnl(slug);
  return json({ locked: false, count: positions.length, averagePnlPercent: averagePnl(positions), positions });
});
