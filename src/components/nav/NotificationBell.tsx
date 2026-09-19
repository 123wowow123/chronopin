'use client';

import Link from '@/components/ui/Link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { clearUnreadCount, useUnreadCount } from '@/lib/client/notifications';
import { timeAgo } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import { useT } from '@/lib/client/i18n';
import type { Translator } from '@/lib/i18n/translate';

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

// Where a comment or reply notification leads: the comment on its pin page.
function commentHref(n: Notification): string {
  const path = pinPath({ id: n.pinId!, title: n.pinTitle ?? '' });
  return n.commentId ? `${path}#comment-${n.commentId}` : path;
}

// Opening the list loads it and marks everything read; a follow notification
// can follow the actor back from the list.
function useNotificationList() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [pending, setPending] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: Notification[] }>('/api/notifications');
      setItems(res.notifications);
      await api.post('/api/notifications/read');
      clearUnreadCount();
    } catch {
      setItems((current) => current ?? []);
    }
  }, []);

  async function followBack(n: Notification) {
    setPending((p) => ({ ...p, [n.actor.id]: true }));
    try {
      await api.post(`/api/users/${n.actor.id}/follow`);
      setItems((list) => list?.map((item) => (item.actor.id === n.actor.id ? { ...item, followingBack: true } : item)) ?? null);
    } finally {
      setPending((p) => ({ ...p, [n.actor.id]: false }));
    }
  }

  return { items, pending, load, followBack };
}

function NotificationItems({
  items,
  pending,
  followBack,
  onNavigate,
  listClassName = '',
}: ReturnType<typeof useNotificationList> & { onNavigate?: () => void; listClassName?: string }) {
  const t = useT();
  if (items === null) return <div className="px-4 py-6 text-center text-sm text-subtle">{t('common.loading')}</div>;
  if (items.length === 0) return <div className="px-4 py-6 text-center text-sm text-subtle">{t('notifications.empty')}</div>;
  return (
    <ul className={listClassName}>
        {items.map((n) => {
          const handle = n.actor.userName.replace(/^@+/, '');
          return (
            <li key={n.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${n.read ? '' : 'bg-accent/10'}`}>
              {n.type === 'today' ? (
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tag-today/15 text-tag-today">
                  <Icon name="target" className="size-4" />
                </span>
              ) : (
                <Link href={`/search?q=user:${encodeURIComponent(handle)}`} onClick={onNavigate}>
                  <UserAvatar userName={n.actor.userName} pictureUrl={n.actor.pictureUrl} className="size-8 text-sm" />
                </Link>
              )}
              <div className="min-w-0 flex-1">
                {n.type === 'follow' ? (
                  <span>
                    {t.rich('notifications.follow', {
                      actor: () => (
                        <Link href={`/search?q=user:${encodeURIComponent(handle)}`} className="font-semibold text-ink" onClick={onNavigate}>
                          {n.actor.userName}
                        </Link>
                      ),
                    })}
                  </span>
                ) : n.type === 'comment' || n.type === 'reply' ? (
                  <Link href={commentHref(n)} className="block text-ink" onClick={onNavigate}>
                    {t.rich(n.type === 'reply' ? 'notifications.reply' : 'notifications.comment', {
                      actor: () => <span className="font-semibold">{n.actor.userName}</span>,
                      pin: () => <span className="font-semibold">{n.pinTitle}</span>,
                    })}
                    {n.commentText ? <span className="mt-0.5 line-clamp-2 block text-muted">“{n.commentText}”</span> : null}
                  </Link>
                ) : n.type === 'reference' && n.pinId ? (
                  <Link href={`${pinPath({ id: n.pinId, title: n.pinTitle ?? '' })}#references-heading`} className="block text-ink" onClick={onNavigate}>
                    {t.rich('notifications.reference', {
                      actor: () => <span className="font-semibold">{n.actor.userName}</span>,
                      pin: () => <span className="font-semibold">{n.pinTitle}</span>,
                    })}
                  </Link>
                ) : n.type === 'today' && n.pinId ? (
                  <Link href={pinPath({ id: n.pinId, title: n.pinTitle ?? '' })} className="block text-ink" onClick={onNavigate}>
                    {t.rich('notifications.today', { pin: () => <span className="font-semibold">{n.pinTitle}</span> })}
                  </Link>
                ) : null}
                <time className="block text-xs text-subtle" dateTime={n.utcCreatedDateTime}>
                  {timeAgo(n.utcCreatedDateTime, undefined, t.locale)}
                </time>
              </div>
              {n.type === 'follow' ? (
                n.followingBack ? (
                  <span className="text-xs text-subtle">{t('notifications.following')}</span>
                ) : (
                  <button
                    type="button"
                    disabled={pending[n.actor.id]}
                    onClick={() => followBack(n)}
                    className="btn btn-sm btn-primary rounded-full"
                  >
                    {t('notifications.followBack')}
                  </button>
                )
              ) : null}
            </li>
          );
        })}
    </ul>
  );
}

function UnreadBadge({ count, className }: { count: number; className: string }) {
  return count ? (
    <span className={`absolute min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-bold text-white ring-2 ring-header ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  ) : null;
}

const unreadLabel = (t: Translator, count: number) => (count ? t('notifications.unreadLabel', { count }) : t('notifications.title'));

// The navbar bell (lg and up), with the list in a panel under it.
export function NotificationBell({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const count = useUnreadCount(true);
  const list = useNotificationList();
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function toggle() {
    setOpen(!open);
    if (!open) void list.load();
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unreadLabel(t, count)} title={t('notifications.title')} className="relative rounded-lg p-2 text-muted hover:bg-raised hover:text-ink">
        <Icon name="bell" className="size-5" />
        <UnreadBadge count={count} className="top-1 right-1" />
      </button>
      {open ? (
        <div className="floating absolute right-0 z-50 mt-2 w-80 overflow-hidden">
          <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">{t('notifications.title')}</div>
          <NotificationItems {...list} listClassName="max-h-96 overflow-auto" onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

// The drawer's Notifications row (below lg): phones get the list as a page of
// its own rather than a panel squeezed under the bell.
export function DrawerNotifications({ className, current }: { className: string; current: boolean }) {
  const count = useUnreadCount(true);
  const t = useT();
  return (
    <Link href="/notifications" aria-current={current ? 'page' : undefined} aria-label={unreadLabel(t, count)} className={className}>
      <span className="relative flex">
        <Icon name="bell" className="size-6" />
        <UnreadBadge count={count} className="-top-1.5 -right-2" />
      </span>
      {t('notifications.title')}
    </Link>
  );
}

// The /notifications page: the whole list, loaded (and marked read) on arrival.
export function NotificationsFeed() {
  const list = useNotificationList();
  const { load } = list;
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="surface overflow-hidden">
      <NotificationItems {...list} listClassName="divide-y divide-line" />
    </div>
  );
}
