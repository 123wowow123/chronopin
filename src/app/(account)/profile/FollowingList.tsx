'use client';

import { useEffect, useRef, useState } from 'react';
import { FollowButton } from '@/components/pin/FollowButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';

type Followed = { id: number; userName: string; pictureUrl: string | null };
export type FollowingPage = { following: Followed[]; total: number; next: number | null };

// How long the filter waits for a pause in the typing.
const FILTER_DELAY_MS = 250;

// The people the viewer follows, newest first, a page at a time (the first
// comes with the page). Past one page there is a filter by handle. Someone
// unfollowed here stays in the list until the page reloads, so a slip can be
// undone.
export function FollowingList({ userId, initial, pageSize }: { userId: number; initial: FollowingPage; pageSize: number }) {
  const [page, setPage] = useState(initial);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Settles filter answers that arrive out of order.
  const requestId = useRef(0);

  async function load(q: string, after: number | null) {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const search = new URLSearchParams();
      if (q.trim()) search.set('q', q.trim());
      if (after) search.set('after', String(after));
      const res = await api.get<FollowingPage>(`/api/users/${userId}/following?${search}`);
      if (id !== requestId.current) return;
      setPage((current) => (after ? { ...res, following: [...current.following, ...res.following] } : res));
    } catch {
      if (id === requestId.current) setError('Could not load who you follow. Please try again.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  const [lastFilter, setLastFilter] = useState(filter);
  useEffect(() => {
    if (filter === lastFilter) return;
    const timer = setTimeout(() => {
      setLastFilter(filter);
      void load(filter, null);
    }, FILTER_DELAY_MS);
    return () => clearTimeout(timer);
    // load is recreated each render; the filter text is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, lastFilter]);

  if (!initial.total) {
    return <p className="surface px-4 py-10 text-center text-subtle">You&apos;re not following anyone yet.</p>;
  }

  const shown = page.following.length;
  return (
    <div className="space-y-3">
      {initial.total > pageSize ? (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by handle"
          aria-label="Filter who you follow by handle"
          className="field"
        />
      ) : null}

      {shown ? (
        <ul className="surface divide-y divide-line">
          {page.following.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar userName={u.userName} pictureUrl={u.pictureUrl} className="size-9 text-base" />
              <a href={`/search?q=user:${encodeURIComponent(u.userName.replace(/^@/, ''))}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-link hover:no-underline">
                {u.userName}
              </a>
              <FollowButton userId={u.id} userName={u.userName} following />
            </li>
          ))}
        </ul>
      ) : loading ? null : (
        <p className="surface px-4 py-8 text-center text-subtle">No one you follow matches “{lastFilter.trim()}”.</p>
      )}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-subtle tabular-nums">
          {loading ? 'Loading…' : page.total > shown || lastFilter.trim() ? `Showing ${shown} of ${page.total}` : null}
        </p>
        {page.next ? (
          <button type="button" disabled={loading} onClick={() => void load(lastFilter, page.next)} className="btn btn-secondary">
            Show more
          </button>
        ) : null}
      </div>
    </div>
  );
}
