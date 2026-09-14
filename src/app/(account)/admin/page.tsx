import type { Metadata } from 'next';
import { toJson } from '@/lib/types';
import { requireAdminViewer } from '@/server/guard';
import { pickUserProps, Users } from '@/server/model/user';
import { UserList } from './UserList';

// Reads the session, so it blocks per request (see ../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Admin' };

export default async function AdminPage() {
  await requireAdminViewer('/admin');
  const users = toJson<Parameters<typeof UserList>[0]['initialUsers']>(await Users.getAll(pickUserProps));
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mb-6 text-sm text-subtle">Deleting and listing users is restricted to the admin role.</p>
      <UserList initialUsers={users} />
    </div>
  );
}
