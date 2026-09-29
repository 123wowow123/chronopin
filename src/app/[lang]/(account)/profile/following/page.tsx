import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import Follow, { FOLLOWING_PAGE_SIZE } from '@/server/model/follow';
import { FollowingList } from '../FollowingList';
import { ProfileTabs } from '../ProfileTabs';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('profile.following') };
}

// The people you follow, a tab of the profile.
export default async function FollowingPage() {
  const user = await requireViewer('/profile/following');
  const [following, t] = await Promise.all([Follow.listFollowing(user.id), getT()]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <ProfileTabs current="/profile/following" />
      <h1 className="sr-only">{t('profile.following')}</h1>
      <p className="mb-6 text-sm text-subtle">
        {t('profile.followingIntro')}
        {following.total ? <span className="ml-2 font-medium text-muted tabular-nums">{following.total}</span> : null}
      </p>
      <FollowingList userId={user.id} initial={following} pageSize={FOLLOWING_PAGE_SIZE} />
    </div>
  );
}
