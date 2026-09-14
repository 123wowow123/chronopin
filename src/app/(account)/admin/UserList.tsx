'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';

type AdminUser = { id: number; userName?: string; firstName?: string; lastName?: string; email?: string; role?: string };

export function UserList({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  async function remove(user: AdminUser) {
    if (!window.confirm(`Delete ${user.userName || user.email}?`)) return;
    await api.delete(`/api/users/${user.id}`);
    setUsers((list) => list.filter((u) => u.id !== user.id));
  }
  return (
    <ul className="divide-y divide-raised rounded bg-panel">
      {users.map((user) => (
        <li key={user.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <strong className="text-ink">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A'}</strong>{' '}
            <span className="text-subtle">{user.userName}</span>
            <br />
            <span className="text-sm">{user.email}</span>
          </div>
          <button type="button" onClick={() => remove(user)} className="text-sm text-red-400" title="Delete user">
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
