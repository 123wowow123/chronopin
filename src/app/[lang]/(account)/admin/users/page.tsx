import type { Metadata } from 'next';
import { toJson } from '@/lib/types';
import { requireAdminViewer } from '@/server/guard';
import { pickUserProps, Users } from '@/server/model/user';
import { AdminTabs } from '../AdminTabs';
import { SignupCharts } from '../SignupCharts';
import { UserList } from '../UserList';

// Reads the session, so it blocks per request (see ../../layout.tsx). The layout's
// own opt-out only covers navigations into the group, not between its pages.
export const instant = false;

export const metadata: Metadata = { title: 'Admin users' };

export default async function AdminUsersPage() {
  await requireAdminViewer('/admin/users');
  const [allUsers, created, activity] = await Promise.all([
    Users.getAll([...pickUserProps, 'utcCreatedDateTime']),
    Users.listCreated(),
    Users.activityCounts(),
  ]);
  const users = toJson<Parameters<typeof UserList>[0]['initialUsers']>(
    allUsers.map((u) => ({ ...u.pick([...pickUserProps, 'utcCreatedDateTime']), ...(activity.get(u.id) ?? { pinsCreated: 0, pinsViewed: 0 }) })),
  );
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/users" />
      <h1 className="sr-only">Users</h1>
      <p className="mb-6 text-sm text-subtle">Deleting and listing users is restricted to the admin role.</p>
      <SignupCharts
        createdTimes={created.map((u) => new Date(u.utcCreatedDateTime).toISOString())}
        liveCount={users.length}
        deletedCount={created.filter((u) => u.deleted).length}
        serverNow={new Date().toISOString()}
      />
      <UserList initialUsers={users} />
    </div>
  );
}
