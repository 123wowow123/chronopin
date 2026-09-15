'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { timeAgo } from '@/lib/format';
import { pinPath } from '@/lib/seo';

type Notification = {
  id: number;
  type: string;
  pinId: number | null;
  pinTitle: string | null;
  commentId: number | null;
  commentText: string | null;
  utcCreatedDateTime: string;
  read: boolean;
  followingBack: boolean;
  actor: { id: number; userName: string; pictureUrl?: string | null };
};

const POLL_MS = 60_000;

// Where a comment or reply notification leads: the comment on its pin page.
function commentHref(n: Notification): string {
  const path = pinPath({ id: n.pinId!, title: n.pinTitle ?? '' });
  return n.commentId ? `${path}#comment-${n.commentId}` : path;
}

// The signed-in user's notifications. The count polls every minute while the
// tab is visible; opening the list loads it and marks everything read.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    api
      .get<{ unreadCount: number }>('/api/notifications/unread-count')
      .then((res) => setCount(res.unreadCount))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(() => {
      if (!document.hidden) refreshCount();
    }, POLL_MS);
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', close);
    };
  }, [refreshCount]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    try {
      const res = await api.get<{ notifications: Notification[] }>('/api/notifications');
      setItems(res.notifications);
      await api.post('/api/notifications/read');
      setCount(0);
    } catch {
      setItems((current) => current ?? []);
    }
  }

  async function followBack(n: Notification) {
    setPending((p) => ({ ...p, [n.actor.id]: true }));
    try {
      await api.post(`/api/users/${n.actor.id}/follow`);
      setItems((list) => list?.map((item) => (item.actor.id === n.actor.id ? { ...item, followingBack: true } : item)) ?? null);
    } finally {
      setPending((p) => ({ ...p, [n.actor.id]: false }));
    }
  }

  const label = count ? `Notifications, ${count} unread` : 'Notifications';

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={label} title="Notifications" className="relative rounded-lg p-2 text-muted hover:bg-raised hover:text-ink">
        <Icon name="bell" className="size-5" />
        {count ? (
          <span className="absolute top-1 right-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-bold text-white ring-2 ring-header">
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="floating fixed inset-x-3 top-[60px] z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80" role="menu">
          <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">Notifications</div>
          {items === null ? (
            <div className="px-4 py-6 text-center text-sm text-subtle">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-subtle">No new notifications available at this time.</div>
          ) : (
            <ul className="max-h-96 overflow-auto">
              {items.map((n) => {
                const handle = n.actor.userName.replace(/^@+/, '');
                return (
                  <li key={n.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${n.read ? '' : 'bg-accent/10'}`} role="menuitem">
                    <Link href={`/search?q=user:${encodeURIComponent(handle)}`} onClick={() => setOpen(false)}>
                      <UserAvatar userName={n.actor.userName} pictureUrl={n.actor.pictureUrl} className="size-8 text-sm" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      {n.type === 'follow' ? (
                        <span>
                          <Link href={`/search?q=user:${encodeURIComponent(handle)}`} className="font-semibold text-ink" onClick={() => setOpen(false)}>
                            {n.actor.userName}
                          </Link>{' '}
                          started following you
                        </span>
                      ) : n.type === 'comment' || n.type === 'reply' ? (
                        <Link href={commentHref(n)} className="block text-ink" onClick={() => setOpen(false)}>
                          <span className="font-semibold">{n.actor.userName}</span>{' '}
                          {n.type === 'reply' ? 'replied to your comment on' : 'commented on'}{' '}
                          <span className="font-semibold">{n.pinTitle}</span>
                          {n.commentText ? <span className="mt-0.5 line-clamp-2 block text-muted">“{n.commentText}”</span> : null}
                        </Link>
                      ) : n.type === 'reference' && n.pinId ? (
                        <Link href={`${pinPath({ id: n.pinId, title: n.pinTitle ?? '' })}#references-heading`} className="block text-ink" onClick={() => setOpen(false)}>
                          <span className="font-semibold">{n.actor.userName}</span> added references to <span className="font-semibold">{n.pinTitle}</span>
                        </Link>
                      ) : null}
                      <time className="block text-xs text-subtle" dateTime={n.utcCreatedDateTime}>
                        {timeAgo(n.utcCreatedDateTime)}
                      </time>
                    </div>
                    {n.type === 'follow' ? (
                      n.followingBack ? (
                        <span className="text-xs text-subtle">Following</span>
                      ) : (
                        <button
                          type="button"
                          disabled={pending[n.actor.id]}
                          onClick={() => followBack(n)}
                          className="btn btn-sm btn-primary rounded-full"
                        >
                          Follow back
                        </button>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
