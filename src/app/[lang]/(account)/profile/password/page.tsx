import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import { PasswordForm } from './PasswordForm';
import { ProfileTabs } from '../ProfileTabs';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('account.changePassword') };
}

// The password you log in with, the profile's last tab; /settings redirects here.
export default async function ChangePasswordPage() {
  const user = await requireViewer('/profile/password');
  const t = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <ProfileTabs current="/profile/password" />
      <h1 className="sr-only">{t('account.changePassword')}</h1>
      <p className="mb-6 text-sm text-subtle">{t.rich('account.changePasswordIntro', { user: () => <strong>{user.userName}</strong> })}</p>
      <PasswordForm userId={user.id} />
    </div>
  );
}
