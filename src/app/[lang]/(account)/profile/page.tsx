import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { toJson, type SessionUser } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import Follow, { FOLLOWING_PAGE_SIZE } from '@/server/model/follow';
import { pickUserProps } from '@/server/model/user';
import { FollowingList } from './FollowingList';
import { CardStockPricesToggle } from './CardStockPricesToggle';
import { PreferencesForm } from './PreferencesForm';
import { ProfileForm } from './ProfileForm';
import { ThemePicker } from './ThemePicker';
import { getT } from '@/lib/i18n/server';
import { LanguageSetting } from './LanguageSetting';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('account.profile') };
}

// Who you are, who you follow and how the app behaves for you, on one page,
// with the way to change your password. /following and /preferences, pages of
// their own once, redirect to their sections (next.config.ts).
export default async function ProfilePage() {
  const user = await requireViewer('/profile');
  const [following, t] = await Promise.all([Follow.listFollowing(user.id), getT()]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t('account.profile')}</h1>
      <p className="mb-6 text-sm text-subtle">{t('profile.intro')}</p>
      <ProfileForm user={toJson<SessionUser>(user.pick(pickUserProps))} />

      <section id="following" aria-labelledby="following-heading" className="mt-10 scroll-mt-[var(--jump-offset)]">
        <h2 id="following-heading" className="mb-1 text-xl font-semibold tracking-tight">
          {t('profile.following')}
          {following.total ? <span className="ml-2 text-base font-normal text-subtle tabular-nums">{following.total}</span> : null}
        </h2>
        <p className="mb-6 text-sm text-subtle">{t('profile.followingIntro')}</p>
        <FollowingList userId={user.id} initial={following} pageSize={FOLLOWING_PAGE_SIZE} />
      </section>

      <section id="preferences" aria-labelledby="preferences-heading" className="mt-10 scroll-mt-[var(--jump-offset)]">
        <h2 id="preferences-heading" className="mb-1 text-xl font-semibold tracking-tight">
          {t('profile.preferences')}
        </h2>
        <p className="mb-6 text-sm text-subtle">{t('profile.preferencesIntro')}</p>
        <div className="space-y-4">
          <ThemePicker userId={user.id} />
          <LanguageSetting userId={user.id} />
          <PreferencesForm userId={user.id} initial={user.defaultFilterSpanPreference ?? null} />
          <CardStockPricesToggle userId={user.id} initial={user.showCardStockPrices !== false} />
        </div>
      </section>

      <section id="password" aria-labelledby="password-heading" className="mt-10 scroll-mt-[var(--jump-offset)]">
        <h2 id="password-heading" className="mb-4 text-xl font-semibold tracking-tight">
          {t('account.password')}
        </h2>
        <div className="surface flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-sm text-subtle">{t('profile.passwordIntro')}</p>
          <Link href="/profile/password" className="btn btn-secondary">
            <Icon name="lock" className="size-4" />
            {t('account.changePassword')}
          </Link>
        </div>
      </section>
    </div>
  );
}
