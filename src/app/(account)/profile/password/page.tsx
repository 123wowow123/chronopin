import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { requireViewer } from '@/server/guard';
import { PasswordForm } from './PasswordForm';

// Reads the session, so it blocks per request (see ../../layout.tsx). The
// layout's own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Change password' };

// Reached from the profile page's Password section; /settings redirects here.
export default async function ChangePasswordPage() {
  const user = await requireViewer('/profile/password');
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/profile" className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-ink hover:no-underline">
        <Icon name="back" className="size-4" />
        Profile
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Change password</h1>
      <p className="mb-6 text-sm text-subtle">
        Enter your current password, then choose a new one for <strong>{user.userName}</strong>.
      </p>
      <PasswordForm userId={user.id} />
    </div>
  );
}
