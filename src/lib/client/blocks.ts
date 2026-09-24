'use client';

// Whom the signed-in reader has blocked (0076), and which companies (0078),
// for client components: the timeline and search leave their pins out, and
// Profile > Blocked lists them. Fetched once per page load, after the session
// is known, and shared. Who blocked the reader is never sent, and their
// comments are already left out by the server.

import { useSyncExternalStore } from 'react';
import { api } from './api';
import { sessionUser } from './session';

export type BlockedUser = { id: number; userName: string; pictureUrl: string | null };
export type BlockedCompany = { id: number; name: string; logoUrl: string | null };

type State = {
  status: 'loading' | 'ready';
  users: BlockedUser[];
  ids: ReadonlySet<number>;
  companies: BlockedCompany[];
  companyIds: ReadonlySet<number>;
};

const EMPTY: State = { status: 'loading', users: [], ids: new Set(), companies: [], companyIds: new Set() };
let state: State = EMPTY;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(users: BlockedUser[], companies: BlockedCompany[]) {
  state = { status: 'ready', users, ids: new Set(users.map((u) => u.id)), companies, companyIds: new Set(companies.map((c) => c.id)) };
  listeners.forEach((l) => l());
}

function load() {
  if (!request) {
    request = sessionUser()
      .then((user) =>
        user
          ? Promise.all([api.get<BlockedUser[]>('/api/users/me/blocks'), api.get<BlockedCompany[]>('/api/users/me/company-blocks')])
          : ([[], []] as [BlockedUser[], BlockedCompany[]]),
      )
      .catch((): [BlockedUser[], BlockedCompany[]] => [[], []])
      .then(([users, companies]) => set(users, companies));
  }
  return request;
}

export function useBlocks(): State {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      void load();
      return () => listeners.delete(listener);
    },
    () => state,
    () => EMPTY,
  );
}

// Blocks someone and drops them from what this page shows at once.
export async function blockUser(user: BlockedUser) {
  await api.put(`/api/users/${user.id}/block`);
  set([user, ...state.users.filter((u) => u.id !== user.id)], state.companies);
}

export async function unblockUser(userId: number) {
  await api.delete(`/api/users/${userId}/block`);
  set(
    state.users.filter((u) => u.id !== userId),
    state.companies,
  );
}

export async function blockCompany(company: BlockedCompany) {
  await api.put(`/api/companies/${company.id}/block`);
  set(state.users, [company, ...state.companies.filter((c) => c.id !== company.id)]);
}

export async function unblockCompany(companyId: number) {
  await api.delete(`/api/companies/${companyId}/block`);
  set(
    state.users,
    state.companies.filter((c) => c.id !== companyId),
  );
}
