import type { Metadata } from 'next';
import { toJson, type SessionUser } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import { pickUserProps } from '@/server/model/user';
import { ProfileForm } from './ProfileForm';
import { ProfileTabs } from './ProfileTabs';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('account.profile') };
}

// Who you are, the first of the account's tabs: who you follow, how the app
// behaves for you and your password are the others (ProfileTabs). /following
// and /preferences, pages of their own once, redirect to theirs (next.config.ts).
export default async function ProfilePage() {
  const user = await requireViewer('/profile');
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <ProfileTabs current="/profile" />
      <h1 className="sr-only">{t('account.profile')}</h1>
      <p className="mb-6 text-sm text-subtle">{t('profile.intro')}</p>
      <ProfileForm user={toJson<SessionUser>(user.pick(pickUserProps))} />
    </div>
  );
}
