import type { Metadata } from 'next';
import { toJson, type SessionUser } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import { pickUserProps } from '@/server/model/user';
import { ProfileForm } from './ProfileForm';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await requireViewer('/profile');
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mb-6 text-sm text-subtle">How you appear on your pins and comments.</p>
      <ProfileForm user={toJson<SessionUser>(user.pick(pickUserProps))} />
    </div>
  );
}
