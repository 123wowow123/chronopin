'use client';

import Link from '@/components/ui/Link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { clearUnreadCount, useUnreadCount } from '@/lib/client/notifications';
import { aimAtCard, dateAtTop } from '@/lib/client/returnSpot';
import { refreshLocalWeather, requestLocalWeather, useLocalWeather } from '@/lib/client/localWeather';
import { formatLocalWeather, usesImperial } from '@/lib/weather';
import { timeAgo } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import { term } from '@/lib/searchTerms';
import { useT } from '@/lib/client/i18n';
import type { Translator } from '@/lib/i18n/translate';

type Notification = {
  id: number;
  type: string;
  pinId: number | null;
  pinTitle: string | null;
  commentId: number | null;
  commentText: string | null;
  companyId: number | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  utcCreatedDateTime: string;
  read: boolean;
  groupCount: number;
  groupDay: string;
  pinIds: number[];
  pinStarts: string[];
  followingBack: boolean;
  actor: { id: number; userName: string; pictureUrl?: string | null };
};

// Where a comment or reply notification leads: the comment on its pin page.
function commentHref(n: Notification): string {
  const path = pinPath({ id: n.pinId!, title: n.pinTitle ?? '' });
  return n.commentId ? `${path}#comment-${n.commentId}` : path;
}

// The search that opens a company's panel, where its Follow button is.
const companyHref = (name: string) => `/search?q=${encodeURIComponent(term('company', name))}`;
const userHref = (handle: string) => `/search?q=user:${encodeURIComponent(handle)}`;

// A batch stands for pins the bell cannot name one by one, so it leads to the
// search holding exactly them - "pin:" names them by id. A batch too big to
// name that way (the server caps the ids it carries) falls back to whose they
// are and the viewer's day they were posted on, the same day it was grouped
// by: a wider net than the batch, but the only one that fits.
function batchHref(n: Notification): string {
  const whose = n.type === 'company' ? term('company', n.companyName ?? '') : term('user', n.actor.userName);
  const q =
    n.pinIds.length === n.groupCount ? term('pin', n.pinIds.join(',')) : `${whose} ${term('posted', n.groupDay)}`;
  return `/search?q=${encodeURIComponent(q)}`;
}

// The pins of a batch were all posted at once but happen on days of their own,
// scattered up and down the timeline, so there is no one day the batch is on.
// The nearest of them to where the reader already stands is: measured from the
// date at the top of their window, or from now when they are not on a page of
// cards by date at all - the day results open on anyway.
function nearestPin(n: Notification): { id: number; start: string } | null {
  const from = dateAtTop() ?? Date.now();
  let found: { id: number; start: string } | null = null;
  let nearest = Infinity;
  for (const [i, id] of n.pinIds.entries()) {
    const start = n.pinStarts?.[i] ?? '';
    const away = Math.abs(Date.parse(start) - from);
    if (away < nearest) {
      nearest = away;
      found = { id, start };
    }
  }
  return found;
}

// Taken as the batch is clicked, so it measures from where the reader is then
// and not from where they were when the list was drawn: its results are the
// batch, but they open on the pin of it nearest that spot rather than on
// today, which may be months from any of them.
function aimBatch(n: Notification, href: string) {
  const pin = nearestPin(n);
  if (pin) aimAtCard(href, pin);
}

// Where a new-pin row leads: the pin itself, or, for a batch, the search
// holding its pins, opened on the nearest of them.
function PinRowLink({ n, onNavigate, children }: { n: Notification; onNavigate?: () => void; children: React.ReactNode }) {
  const href = n.groupCount > 1 ? batchHref(n) : pinPath({ id: n.pinId!, title: n.pinTitle ?? '' });
  return (
    <Link
      href={href}
      className="block text-ink"
      onClick={() => {
        if (n.groupCount > 1) aimBatch(n, href);
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}

// Why this notification reached the viewer at all, said under the text: the
// watch or the follow that let it through, or the thing of theirs it happened
// to. The actor's avatar alone cannot say it - a company's new pin wears its
// author's face, who the viewer may not follow at all. A 'follow' says it in
// its own words ("started following you"), so it gets no line.
function reasonOf(n: Notification, t: Translator): { icon: IconName; label: string; href?: string } | null {
  switch (n.type) {
    case 'today':
      return { icon: 'eye', label: t('notifications.whyWatch') };
    case 'company':
      return n.companyName
        ? { icon: 'users', label: t('notifications.whyCompany', { company: n.companyName }), href: companyHref(n.companyName) }
        : null;
    case 'pin':
      return {
        icon: 'users',
        label: t('notifications.whyUser', { user: n.actor.userName }),
        href: userHref(n.actor.userName.replace(/^@+/, '')),
      };
    case 'comment':
    case 'reference':
      return { icon: 'pin', label: t('notifications.whyYourPin') };
    case 'reply':
      return { icon: 'thread', label: t('notifications.whyYourComment') };
    default:
      return null;
  }
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

// The face at the left of a row: a mark of its own for a pin landing today,
// the company's logo for one of its pins (its author's avatar would look like
// the pin came from them), otherwise the actor. A batch wears the number it
// stands for, so a run of pins is countable straight down the left edge.
function NotificationFace({ n, onNavigate }: { n: Notification; onNavigate?: () => void }) {
  const handle = n.actor.userName.replace(/^@+/, '');
  const face =
    n.type === 'today' ? (
      <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-tag-today/15 text-tag-today">
        <Icon name="target" className="size-4" />
      </span>
    ) : n.type === 'company' && n.companyName ? (
      <Link href={companyHref(n.companyName)} onClick={onNavigate}>
        {n.companyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- favicons from arbitrary hosts
          <img src={n.companyLogoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-8 rounded bg-raised object-contain" />
        ) : (
          <span aria-hidden className="flex size-8 items-center justify-center rounded bg-raised text-muted">
            <Icon name="users" className="size-4" />
          </span>
        )}
      </Link>
    ) : (
      <Link href={userHref(handle)} onClick={onNavigate}>
        <UserAvatar userName={n.actor.userName} pictureUrl={n.actor.pictureUrl} className="size-8 text-sm" />
      </Link>
    );
  return (
    <span className="relative shrink-0">
      {face}
      {n.groupCount > 1 ? (
        <span
          aria-hidden
          className="absolute -right-1.5 -bottom-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold tabular-nums text-white ring-2 ring-panel"
        >
          {n.groupCount > 99 ? '99+' : n.groupCount}
        </span>
      ) : null}
    </span>
  );
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
          const reason = reasonOf(n, t);
          return (
            <li key={n.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${n.read ? '' : 'bg-accent/10'}`}>
              <NotificationFace n={n} onNavigate={onNavigate} />
              <div className="min-w-0 flex-1">
                {n.type === 'follow' ? (
                  <span>
                    {t.rich('notifications.follow', {
                      actor: () => (
                        <Link href={userHref(handle)} className="font-semibold text-ink" onClick={onNavigate}>
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
                ) : n.type === 'pin' && n.pinId ? (
                  <PinRowLink n={n} onNavigate={onNavigate}>
                    {t.rich(n.groupCount > 1 ? 'notifications.pinMany' : 'notifications.pin', {
                      count: n.groupCount,
                      actor: () => <span className="font-semibold">{n.actor.userName}</span>,
                      pin: () => <span className="font-semibold">{n.pinTitle}</span>,
                      n: (chunks) => (
                        <span className="mx-0.5 inline-block rounded-full bg-accent px-1.5 py-px text-xs leading-tight font-bold tabular-nums text-white">
                          {chunks}
                        </span>
                      ),
                    })}
                  </PinRowLink>
                ) : n.type === 'company' && n.pinId ? (
                  <PinRowLink n={n} onNavigate={onNavigate}>
                    {t.rich(n.groupCount > 1 ? 'notifications.companyMany' : 'notifications.company', {
                      count: n.groupCount,
                      company: () => <span className="font-semibold">{n.companyName}</span>,
                      pin: () => <span className="font-semibold">{n.pinTitle}</span>,
                      n: (chunks) => (
                        <span className="mx-0.5 inline-block rounded-full bg-accent px-1.5 py-px text-xs leading-tight font-bold tabular-nums text-white">
                          {chunks}
                        </span>
                      ),
                    })}
                  </PinRowLink>
                ) : null}
                <div className="mt-0.5 flex items-center gap-1 text-xs text-subtle">
                  {reason ? (
                    <>
                      <Icon name={reason.icon} className="size-3 shrink-0" />
                      {reason.href ? (
                        <Link href={reason.href} className="truncate text-subtle hover:text-ink" onClick={onNavigate}>
                          {reason.label}
                        </Link>
                      ) : (
                        <span className="truncate">{reason.label}</span>
                      )}
                      <span aria-hidden>·</span>
                    </>
                  ) : null}
                  <time className="shrink-0" dateTime={n.utcCreatedDateTime}>
                    {timeAgo(n.utcCreatedDateTime, undefined, t.locale)}
                  </time>
                </div>
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

// The viewer's weather in their own terms, or null until there is some.
function useFormattedLocalWeather() {
  const local = useLocalWeather();
  const t = useT();
  return { local, weather: local.status === 'ready' ? formatLocalWeather(local.weather, usesImperial(), t) : null };
}

// The top row of the bell's menu: the weather where the viewer is, which
// loads on its own. The button is only for a viewer whose time zone named no
// city; nothing at all once they have said no.
function LocalWeatherRow({ className = '' }: { className?: string }) {
  const { local, weather } = useFormattedLocalWeather();
  const t = useT();
  if (local.status === 'ask') {
    return (
      <button type="button" onClick={requestLocalWeather} title={t('weather.showLocalHint')} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-muted hover:bg-raised hover:text-ink ${className}`}>
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Icon name="sun" className="size-4" />
        </span>
        {t('weather.showLocal')}
      </button>
    );
  }
  if (local.status === 'loading') {
    return <div className={`px-4 py-2.5 text-sm text-subtle ${className}`}>{t('common.loading')}</div>;
  }
  if (!weather) return null;
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm ${className}`} title={weather.summary}>
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
        <Icon name={weather.icon} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-ink">
          <span className="font-semibold">{weather.now}</span>
          <span className="truncate">{weather.label}</span>
          <span className="ml-auto shrink-0 text-xs text-muted" title={t('weather.highLow', { unit: weather.unit })}>
            {weather.high} <span className="text-subtle">{weather.low}</span>
          </span>
        </div>
        <div className="truncate text-xs text-subtle">{[weather.place, weather.precipitation].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
  );
}

// The weather beside the bell rather than over it: the conditions with the
// degrees right under them, flush on one left edge. It stands next to the
// bell, not on it, so the bell itself stays plain to read.
function WeatherPeek({ className = '' }: { className?: string }) {
  const { weather } = useFormattedLocalWeather();
  return weather ? (
    <span aria-hidden className={`flex shrink-0 flex-col items-start gap-0.5 leading-none ${className}`} title={weather.summary}>
      <Icon name={weather.icon} className="size-3.5 text-warning" />
      {weather.now ? <span className="text-[10px] font-bold tabular-nums">{weather.now}</span> : null}
    </span>
  ) : null;
}

function UnreadBadge({ count, className }: { count: number; className: string }) {
  return count ? (
    <span className={`absolute min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-bold text-white ring-2 ring-header ${className}`}>
      {count > 9 ? '9+' : count}
    </span>
  ) : null;
}

const unreadLabel = (t: Translator, count: number) => (count ? t('notifications.unreadLabel', { count }) : t('notifications.title'));

// A navbar panel's open state, closed by a press anywhere outside it.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return { open, setOpen, rootRef };
}

// In the bell's place for visitors who are not signed in (lg and up): the
// weather icon, with the weather row in a panel under it. Nothing once they
// have refused their location.
export function WeatherButton({ className = '' }: { className?: string }) {
  const { open, setOpen, rootRef } = useDropdown();
  const { local, weather } = useFormattedLocalWeather();
  const t = useT();
  if (local.status === 'off') return null;

  function toggle() {
    setOpen(!open);
    if (!open) refreshLocalWeather();
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={weather ? weather.summary : t('weather.local')}
        title={weather ? weather.summary : t('weather.local')}
        className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-muted hover:bg-raised hover:text-ink"
      >
        <Icon name={weather ? weather.icon : 'sun'} className={`size-5 ${weather ? 'text-warning' : ''}`} />
        {weather?.now ? <span className="text-[10px] leading-none font-medium">{weather.now}</span> : null}
      </button>
      {open ? (
        <div className="floating absolute right-0 z-50 mt-2 w-80 overflow-hidden">
          <LocalWeatherRow />
        </div>
      ) : null}
    </div>
  );
}

// The navbar bell (lg and up), with the list in a panel under it.
export function NotificationBell({ className = '' }: { className?: string }) {
  const { open, setOpen, rootRef } = useDropdown();
  const count = useUnreadCount(true);
  const list = useNotificationList();
  const t = useT();
  const { weather } = useFormattedLocalWeather();

  function toggle() {
    setOpen(!open);
    if (!open) {
      void list.load();
      refreshLocalWeather();
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unreadLabel(t, count)} title={weather ? `${t('notifications.title')} · ${weather.summary}` : t('notifications.title')} className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-muted hover:bg-raised hover:text-ink">
        <WeatherPeek />
        <span className="relative flex">
          <Icon name="bell" className="size-5" />
          <UnreadBadge count={count} className="-top-1 -right-1.5" />
        </span>
      </button>
      {open ? (
        <div className="floating absolute right-0 z-50 mt-2 w-80 overflow-hidden">
          <LocalWeatherRow className="border-b border-line" />
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
      <WeatherPeek className="ml-auto text-muted" />
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
      <LocalWeatherRow className="border-b border-line" />
      <NotificationItems {...list} listClassName="divide-y divide-line" />
    </div>
  );
}
