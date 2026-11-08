import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Follow from '@/server/model/follow';
import Notification from '@/server/model/notification';
import PersonTrade from '@/server/model/personTrade';
import PremiumSubscription from '@/server/model/premiumSubscription';
import * as db from '@/server/db';
import { recentPositions } from '@/server/services/traders';

// Signed-in side panel data for /people: watched people, followed users,
// recent stock-trade filings (watched and public) in notification format,
// recent pins linked to people, and Premium trader portfolio moves.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const recentSince = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const [allStatus, watchedPeople, followingUsers, watchedTrades, recentTrades, recentPins, traderMoves] = await Promise.all([
    PersonTrade.statusAll(user.id),
    PersonTrade.listWatchedDetails(user.id),
    Follow.listFollowing(user.id, { limit: 30 }),
    Notification.listRecentTradeFilings({ userId: user.id, watchedOnly: true, limit: 15 }),
    Notification.listRecentTradeFilings({ userId: user.id, watchedOnly: false, limit: 15 }),
    PersonTrade.listRecentPeoplePins(user.id, 8),
    PremiumSubscription.hasAccess(user).then(async (hasPremium) => {
      if (!hasPremium) return { locked: true, recentSince, positions: [], people: {} };
      const positions = await recentPositions('2000-01-01', 100);
      // The tracked investors as people, so each can be watched from the panel.
      const slugs = [...new Set(positions.map((p) => p.traderSlug))];
      const traderPeople = slugs.length
        ? await db.query<{ slug: string; id: number; watching: boolean }>(
            `SELECT pe."slug", pe."id",
                    EXISTS (SELECT 1 FROM "PersonTradeWatch" w WHERE w."userId" = $2 AND w."personId" = pe."id" AND w."utcDeletedDateTime" IS NULL) AS "watching"
             FROM "Person" pe WHERE pe."slug" = ANY($1::text[])`,
            [slugs, user.id],
          )
        : [];
      return {
        locked: false,
        recentSince,
        positions,
        people: Object.fromEntries(traderPeople.map((r) => [r.slug, { id: r.id, watching: r.watching }])),
      };
    }),
  ]);
  return json({
    watchingAll: allStatus.watching,
    watcherCount: allStatus.watcherCount,
    watchedPeople,
    followingUsers,
    watchedTrades,
    recentTrades,
    recentPins,
    traderMoves,
  });
});
