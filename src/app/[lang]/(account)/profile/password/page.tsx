import type { Metadata } from 'next';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { requireViewer } from '@/server/guard';
import { PasswordForm } from './PasswordForm';
import { getT } from '@/lib/i18n/server';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())('account.changePassword') };
}

// Reached from the profile page's Password section; /settings redirects here.
export default async function ChangePasswordPage() {
  const user = await requireViewer('/profile/password');
  const t = await getT();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/profile" className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-ink hover:no-underline">
        <Icon name="back" className="size-4" />
        {t('account.profile')}
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{t('account.changePassword')}</h1>
      <p className="mb-6 text-sm text-subtle">{t.rich('account.changePasswordIntro', { user: () => <strong>{user.userName}</strong> })}</p>
      <PasswordForm userId={user.id} />
    </div>
  );
}
