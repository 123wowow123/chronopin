'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';

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
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
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
          {status.followerCount} {status.followerCount === 1 ? 'follower' : 'followers'} · {status.followingCount} following
        </span>
      ) : null}
      <button
        type="button"
        onClick={toggle}
        disabled={busy || (isLoggedIn && !status)}
        title={status?.following ? `Unfollow ${userName}` : `Follow ${userName}`}
        className={`group btn rounded-full px-4 py-1.5 ${status?.following ? 'btn-secondary hover:bg-red-500/15 hover:text-danger-soft hover:ring-red-500/30' : 'btn-primary'}`}
      >
        {status?.following ? (
          <>
            <span className="group-hover:hidden">Following</span>
            <span className="hidden group-hover:inline">Unfollow</span>
          </>
        ) : status?.followsYou ? (
          'Follow back'
        ) : (
          'Follow'
        )}
      </button>
    </span>
  );
}
