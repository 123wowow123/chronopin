import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Follow from '@/server/model/follow';
import Notification from '@/server/model/notification';
import PersonTrade from '@/server/model/personTrade';
import PremiumSubscription from '@/server/model/premiumSubscription';
import { recentPositions } from '@/server/services/traders';

// Signed-in side panel data for /people: watched people, followed users,
// recent stock-trade filings (watched and public) in notification format,
// recent pins linked to people, and Premium trader portfolio moves.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const [allStatus, watchedPeople, followingUsers, watchedTrades, recentTrades, recentPins, hasPremium] = await Promise.all([
    PersonTrade.statusAll(user.id),
    PersonTrade.listWatchedDetails(user.id),
    Follow.listFollowing(user.id, { limit: 30 }),
    Notification.listRecentTradeFilings({ userId: user.id, watchedOnly: true, limit: 15 }),
    Notification.listRecentTradeFilings({ userId: user.id, watchedOnly: false, limit: 15 }),
    PersonTrade.listRecentPeoplePins(user.id, 8),
    PremiumSubscription.hasAccess(user),
  ]);
  const positions = hasPremium ? await recentPositions(since, 8) : [];
  return json({
    watchingAll: allStatus.watching,
    watcherCount: allStatus.watcherCount,
    watchedPeople,
    followingUsers,
    watchedTrades,
    recentTrades,
    recentPins,
    traderMoves: {
      locked: !hasPremium,
      positions,
    },
  });
});
