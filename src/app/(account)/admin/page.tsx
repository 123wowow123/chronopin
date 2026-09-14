import type { Metadata } from 'next';
import { toJson } from '@/lib/types';
import { requireAdminViewer } from '@/server/guard';
import { pickUserProps, Users } from '@/server/model/user';
import { UserList } from './UserList';

export const metadata: Metadata = { title: 'Admin' };

export default async function AdminPage() {
  await requireAdminViewer('/admin');
  const users = toJson<Parameters<typeof UserList>[0]['initialUsers']>(await Users.getAll(pickUserProps));
  return (
    <div className="px-4 py-6">
      <h1 className="mb-2 text-3xl">Users</h1>
      <p className="mb-4 text-sm text-subtle">Deleting and listing users is restricted to the admin role.</p>
      <UserList initialUsers={users} />
    </div>
  );
}
