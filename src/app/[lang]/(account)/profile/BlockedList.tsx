'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { unblockUser, type BlockedUser } from '@/lib/client/blocks';
import { useT } from '@/lib/client/i18n';

// The people the viewer blocked, most recent first, each with Unblock. One
// unblocked leaves the list at once.
export function BlockedList({ initial }: { initial: BlockedUser[] }) {
  const t = useT();
  const [blocked, setBlocked] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);

  async function unblock(user: BlockedUser) {
    setBusy(user.id);
    setFailed(null);
    try {
      await unblockUser(user.id);
      setBlocked((list) => list.filter((u) => u.id !== user.id));
    } catch {
      setFailed(user.id);
    } finally {
      setBusy(null);
    }
  }

  if (!blocked.length) {
    return <p className="surface px-4 py-10 text-center text-subtle">{t('profile.blockedNone')}</p>;
  }
  return (
    <ul className="surface divide-y divide-line">
      {blocked.map((u) => (
        <li key={u.id} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <UserAvatar userName={u.userName} pictureUrl={u.pictureUrl} className="size-9 text-base" />
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{u.userName}</span>
            <button type="button" disabled={busy === u.id} onClick={() => void unblock(u)} className="btn btn-secondary">
              {t('profile.unblock')}
            </button>
          </div>
          {failed === u.id ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {t('profile.unblockFailed')}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
