import type { Metadata } from 'next';
import { requireViewer } from '@/server/guard';
import { PasswordForm } from './PasswordForm';

export const metadata: Metadata = { title: 'Password' };

export default async function SettingsPage() {
  const user = await requireViewer('/settings');
  return (
    <div className="px-4 py-8">
      <PasswordForm userId={user.id} userName={user.userName} />
    </div>
  );
}
