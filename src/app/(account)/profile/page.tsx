import type { Metadata } from 'next';
import { toJson, type SessionUser } from '@/lib/types';
import { requireViewer } from '@/server/guard';
import { pickUserProps } from '@/server/model/user';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await requireViewer('/profile');
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-3xl">Profile</h1>
      <ProfileForm user={toJson<SessionUser>(user.pick(pickUserProps))} />
    </div>
  );
}
