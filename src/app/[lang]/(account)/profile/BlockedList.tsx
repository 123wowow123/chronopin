'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { unblockCompany, unblockUser, type BlockedCompany, type BlockedUser } from '@/lib/client/blocks';
import { useT } from '@/lib/client/i18n';

// The people and companies the viewer blocked, most recent first, each with
// Unblock. One unblocked leaves the list at once.
export function BlockedList({ initialUsers, initialCompanies }: { initialUsers: BlockedUser[]; initialCompanies: BlockedCompany[] }) {
  const t = useT();
  const [users, setUsers] = useState(initialUsers);
  const [companies, setCompanies] = useState(initialCompanies);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function unblock(key: string, action: () => Promise<void>, drop: () => void) {
    setBusy(key);
    setFailed(null);
    try {
      await action();
      drop();
    } catch {
      setFailed(key);
    } finally {
      setBusy(null);
    }
  }

  if (!users.length && !companies.length) {
    return <p className="surface px-4 py-10 text-center text-subtle">{t('profile.blockedNone')}</p>;
  }
  const row = (key: string, picture: React.ReactNode, name: string, onUnblock: () => void) => (
    <li key={key} className="px-4 py-3">
      <div className="flex items-center gap-3">
        {picture}
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{name}</span>
        <button type="button" disabled={busy === key} onClick={onUnblock} className="btn btn-secondary">
          {t('profile.unblock')}
        </button>
      </div>
      {failed === key ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {t('profile.unblockFailed')}
        </p>
      ) : null}
    </li>
  );
  return (
    <div className="space-y-6">
      {users.length ? (
        <section aria-labelledby="blocked-people">
          <h2 id="blocked-people" className="mb-2 text-sm font-semibold text-muted">
            {t('profile.blockedPeople')}
          </h2>
          <ul className="surface divide-y divide-line">
            {users.map((u) =>
              row(`u${u.id}`, <UserAvatar userName={u.userName} pictureUrl={u.pictureUrl} className="size-9 text-base" />, u.userName, () =>
                void unblock(`u${u.id}`, () => unblockUser(u.id), () => setUsers((list) => list.filter((x) => x.id !== u.id))),
              ),
            )}
          </ul>
        </section>
      ) : null}
      {companies.length ? (
        <section aria-labelledby="blocked-companies">
          <h2 id="blocked-companies" className="mb-2 text-sm font-semibold text-muted">
            {t('profile.blockedCompanies')}
          </h2>
          <ul className="surface divide-y divide-line">
            {companies.map((c) =>
              row(
                `c${c.id}`,
                c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a small logo from wherever the company's lives
                  <img src={c.logoUrl} alt="" className="size-9 shrink-0 rounded-lg bg-white object-contain p-1" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised font-semibold text-muted">{c.name[0]}</span>
                ),
                c.name,
                () => void unblock(`c${c.id}`, () => unblockCompany(c.id), () => setCompanies((list) => list.filter((x) => x.id !== c.id))),
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
