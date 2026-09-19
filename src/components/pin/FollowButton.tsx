'use client';

import { useRouter } from '@/lib/client/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useT } from '@/lib/client/i18n';

type Status = { userId: number; followerCount: number; followingCount: number; following: boolean; followsYou: boolean };

// Follow a pin's author, with their follower counts. A list that already knows
// whether the viewer follows each person passes `following`, so a long list
// does not ask the server once per row.
export function FollowButton({ userId, userName, showCount, following }: { userId: number; userName: string; showCount?: boolean; following?: boolean }) {
  const router = useRouter();
  const { user, isLoggedIn, status: sessionStatus } = useSession();
  const [status, setStatus] = useState<Status | null>(
    following === undefined ? null : { userId, followerCount: 0, followingCount: 0, following, followsYou: false },
  );
  const known = following !== undefined;
  const [busy, setBusy] = useState(false);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    if (known || sessionStatus !== 'ready') return;
    api
      .get<Status>(`/api/users/${userId}/follow`)
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, [known, userId, sessionStatus, user?.id]);

  if (user && user.userName.toLowerCase() === userName.toLowerCase()) {
    return null;
  }

  async function toggle() {
    if (!isLoggedIn) {
      router.push(authHrefHere());
      return;
    }
    if (busy || !status) return;
    setBusy(true);
    try {
      setStatus(status.following ? await api.delete<Status>(`/api/users/${userId}/follow`) : await api.post<Status>(`/api/users/${userId}/follow`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-3">
      {showCount && status ? (
        <span className="text-sm text-muted">
          {t('follow.followers', { count: status.followerCount })} · {t('follow.followingCount', { count: status.followingCount })}
        </span>
      ) : null}
      <button
        type="button"
        onClick={toggle}
        disabled={busy || (isLoggedIn && !status)}
        title={status?.following ? t('follow.unfollowName', { name: userName }) : t('follow.followName', { name: userName })}
        className={`group btn rounded-full px-4 py-1.5 ${status?.following ? 'btn-secondary hover:bg-red-500/15 hover:text-danger-soft hover:ring-red-500/30' : 'btn-primary'}`}
      >
        {status?.following ? (
          <>
            <span className="group-hover:hidden">{t('follow.following')}</span>
            <span className="hidden group-hover:inline">{t('follow.unfollow')}</span>
          </>
        ) : status?.followsYou ? (
          t('follow.followBack')
        ) : (
          t('follow.follow')
        )}
      </button>
    </span>
  );
}
