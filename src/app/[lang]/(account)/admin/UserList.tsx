'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';

type AdminUser = {
  id: number;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  utcCreatedDateTime?: string;
  pinsCreated: number;
  pinsViewed: number;
  viewsReceived: number;
};

type SortKey = 'signup' | 'viewed' | 'created' | 'received';

// Each sort opens on its most useful end: newest sign-ups, most views, most
// pins. Choosing the sort already in use flips it.
const SORTS: { key: SortKey; label: string; value: (u: AdminUser) => number }[] = [
  { key: 'signup', label: 'Sign-up date', value: (u) => (u.utcCreatedDateTime ? Date.parse(u.utcCreatedDateTime) : 0) },
  { key: 'viewed', label: 'Pins viewed', value: (u) => u.pinsViewed },
  { key: 'created', label: 'Pins created', value: (u) => u.pinsCreated },
  { key: 'received', label: 'Views on their pins', value: (u) => u.viewsReceived },
];

// UTC, like the signup charts, so the server and client render the same day.
const joined = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const count = new Intl.NumberFormat('en-US');

export function UserList({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'signup', descending: true });

  async function remove(user: AdminUser) {
    if (!window.confirm(`Delete ${user.userName || user.email}?`)) return;
    await api.delete(`/api/users/${user.id}`);
    setUsers((list) => list.filter((u) => u.id !== user.id));
  }

  const { value } = SORTS.find((s) => s.key === sort.key)!;
  // Ties (most users have no pins) fall back to the newest sign-up first.
  const sorted = [...users].sort(
    (a, b) => (sort.descending ? value(b) - value(a) : value(a) - value(b)) || SORTS[0].value(b) - SORTS[0].value(a),
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Sort users">
        <span className="text-subtle">Sort by</span>
        {SORTS.map((s) => {
          const active = s.key === sort.key;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSort((cur) => (cur.key === s.key ? { ...cur, descending: !cur.descending } : { key: s.key, descending: true }))}
              className={`btn btn-sm ${active ? 'btn-secondary' : 'btn-ghost'}`}
            >
              {s.label}
              {active ? <span aria-label={sort.descending ? 'descending' : 'ascending'}>{sort.descending ? ' ↓' : ' ↑'}</span> : null}
            </button>
          );
        })}
      </div>
      <ul className="surface divide-y divide-line">
        {sorted.map((user) => (
          <li key={user.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <strong className="text-ink">{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'N/A'}</strong>{' '}
              <span className="text-subtle">{user.userName}</span>
              <br />
              <span className="text-sm text-subtle">{user.email}</span>
              <br />
              <span className="text-xs text-subtle">
                {user.utcCreatedDateTime ? `Signed up ${joined.format(new Date(user.utcCreatedDateTime))} · ` : ''}
                {count.format(user.pinsCreated)} {user.pinsCreated === 1 ? 'pin' : 'pins'} created · {count.format(user.pinsViewed)}{' '}
                {user.pinsViewed === 1 ? 'pin view' : 'pin views'} · {count.format(user.viewsReceived)}{' '}
                {user.viewsReceived === 1 ? 'view' : 'views'} on their pins
              </span>
            </div>
            <button type="button" onClick={() => remove(user)} className="btn btn-sm btn-ghost text-danger hover:bg-red-500/10 hover:text-danger-soft" title="Delete user">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
