import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { toJson, type SessionUser } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import Follow, { FOLLOWING_PAGE_SIZE } from '@/server/model/follow';
import { pickUserProps } from '@/server/model/user';
import { FollowingList } from './FollowingList';
import { PreferencesForm } from './PreferencesForm';
import { ProfileForm } from './ProfileForm';
import { ThemePicker } from './ThemePicker';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Profile' };

// Who you are, who you follow and how the app behaves for you, on one page,
// with the way to change your password. /following and /preferences, pages of
// their own once, redirect to their sections (next.config.ts).
export default async function ProfilePage() {
  const user = await requireViewer('/profile');
  const following = await Follow.listFollowing(user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mb-6 text-sm text-subtle">How you appear on your pins and comments.</p>
      <ProfileForm user={toJson<SessionUser>(user.pick(pickUserProps))} />

      <section id="following" aria-labelledby="following-heading" className="mt-10 scroll-mt-[var(--jump-offset)]">
        <h2 id="following-heading" className="mb-1 text-xl font-semibold tracking-tight">
          Following
          {following.total ? <span className="ml-2 text-base font-normal text-subtle tabular-nums">{following.total}</span> : null}
        </h2>
        <p className="mb-6 text-sm text-subtle">People whose new pins you hear about.</p>
        <FollowingList userId={user.id} initial={following} pageSize={FOLLOWING_PAGE_SIZE} />
      </section>

      <section id="preferences" aria-labelledby="preferences-heading" className="mt-10 scroll-mt-[var(--jump-offset)]">
        <h2 id="preferences-heading" className="mb-1 text-xl font-semibold tracking-tight">
          Preferences
        </h2>
        <p className="mb-6 text-sm text-subtle">How Chronopin looks, and how the timeline opens for you.</p>
        <div className="space-y-4">
          <ThemePicker userId={user.id} />
          <PreferencesForm userId={user.id} initial={user.defaultFilterSpanPreference ?? null} />
        </div>
      </section>

      <section id="password" aria-labelledby="password-heading" className="mt-10 scroll-mt-[var(--jump-offset)]">
        <h2 id="password-heading" className="mb-4 text-xl font-semibold tracking-tight">
          Password
        </h2>
        <div className="surface flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-sm text-subtle">The password you log in with.</p>
          <Link href="/profile/password" className="btn btn-secondary">
            <Icon name="lock" className="size-4" />
            Change password
          </Link>
        </div>
      </section>
    </div>
  );
}
