'use client';

import { useRouter } from '@/lib/client/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { savePendingAction, usePendingAction } from '@/lib/client/pendingAction';
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
  // Set once this viewer follows or unfollows here, so an answer that was
  // already on its way does not put back what they have just changed.
  const acted = useRef(false);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    if (known || sessionStatus !== 'ready') return;
    api
      .get<Status>(`/api/users/${userId}/follow`)
      .then((s) => !cancelled && !acted.current && setStatus(s))
      .catch(() => !cancelled && !acted.current && setStatus(null));
    return () => {
      cancelled = true;
    };
  }, [known, userId, sessionStatus, user?.id]);

  // The follow that sent the reader off to log in, now they are back and
  // known: the trip finishes the click rather than losing it.
  const buttonRef = usePendingAction<HTMLButtonElement>(
    { kind: 'followUser', id: userId },
    isLoggedIn,
    useCallback(() => {
      acted.current = true;
      return api.post<Status>(`/api/users/${userId}/follow`).then(setStatus);
    }, [userId]),
  );

  if (user && user.userName.toLowerCase() === userName.toLowerCase()) {
    return null;
  }

  async function toggle() {
    if (!isLoggedIn) {
      if (sessionStatus === 'ready') {
        // Kept for the way back: logging in follows them and returns to where
        // the reader was, rather than leaving them to find it and click again.
        savePendingAction({ kind: 'followUser', id: userId });
        router.push(authHrefHere());
      }
      return;
    }
    if (busy || !status) return;
    acted.current = true;
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
          <span className="whitespace-nowrap">{t('follow.followers', { count: status.followerCount })}</span> ·{' '}
          <span className="whitespace-nowrap">{t('follow.followingCount', { count: status.followingCount })}</span>
        </span>
      ) : null}
      <button
        ref={buttonRef}
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
