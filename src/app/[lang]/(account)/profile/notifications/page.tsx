import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import Follow, { FOLLOWING_PAGE_SIZE } from '@/server/model/follow';
import Favorite from '@/server/model/favorite';
import Pins from '@/server/model/pins';
import ThreadWatch from '@/server/model/threadWatch';
import CompanyFollow from '@/server/model/companyFollow';
import PersonTrade from '@/server/model/personTrade';
import { StockAlertsList } from '../StockAlertsList';
import { FollowingList } from '../FollowingList';
import { ProfileTabs } from '../ProfileTabs';
import Digest from '@/server/model/digest';
import MoveAlert from '@/server/model/moveAlert';
import PremiumSubscription from '@/server/model/premiumSubscription';
import { MoveAlertsList } from '../MoveAlertsList';
import { WatchAlertsSetting } from '../WatchAlertsSetting';
import { SearchAlertsList } from '../SearchAlertsList';
import SearchAlert from '@/server/model/searchAlert';
import { WeeklyDigestSetting } from '../WeeklyDigestSetting';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('notifications.title') };
}

// How you are notified, a tab of the profile: the browser alerts and reminders
// for watched pins, the weekly email, the people you follow, and the companies and stock trades
// you follow (unfollow them all here).
export default async function ProfileNotificationsPage() {
  const user = await requireViewer('/profile/notifications');
  const [following, companies, people, all, threads, watchedPins, digest, premium, moveAlerts, searchAlerts, t] = await Promise.all([
    Follow.listFollowing(user.id),
    CompanyFollow.listFor(user.id),
    PersonTrade.listWatchedBy(user.id),
    PersonTrade.statusAll(user.id),
    ThreadWatch.listFor(user.id),
    Favorite.listPinsFor(user.id),
    Digest.isSubscribed(user.id),
    PremiumSubscription.hasAccess(user),
    MoveAlert.list(user.id),
    SearchAlert.list(user.id),
    getT(),
  ]);
  // Watching a thread watches each pin in it; those pins are listed once, as the thread.
  const inThreads = new Set((await Promise.all(threads.map((th) => Pins.threadIds(th.id)))).flat());
  const pins = watchedPins.filter((p) => !inThreads.has(p.id));
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 lg:max-w-5xl">
      <ProfileTabs current="/profile/notifications" />
      <h1 className="sr-only">{t('notifications.title')}</h1>
      <div className="mb-8 space-y-4">
        <WatchAlertsSetting userId={user.id} initialRemind={user.remindBeforeStart === true} />
        <WeeklyDigestSetting userId={user.id} initial={digest} />
        <SearchAlertsList initial={searchAlerts} />
        <MoveAlertsList premium={premium} initial={moveAlerts} />
      </div>
      <h2 className="mb-1 text-lg font-semibold text-ink">{t('profile.followingUsers')}</h2>
      <p className="mb-4 text-sm text-subtle">
        {t('profile.followingIntro')}
        {following.total ? <span className="ms-2 font-medium text-muted tabular-nums">{following.total}</span> : null}
      </p>
      <FollowingList userId={user.id} initial={following} pageSize={FOLLOWING_PAGE_SIZE} />
      <div className="mt-8">
        <StockAlertsList alerts={{ companies, people, watchingAll: all.watching, threads, pins }} />
      </div>
    </div>
  );
}
