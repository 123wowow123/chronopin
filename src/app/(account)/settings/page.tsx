import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import { PasswordForm } from './PasswordForm';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Password' };

export default async function SettingsPage() {
  const user = await requireViewer('/settings');
  return (
    <div className="px-4 py-10">
      <PasswordForm userId={user.id} userName={user.userName} />
    </div>
  );
}
