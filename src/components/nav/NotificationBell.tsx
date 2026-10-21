'use client';

import { personPath } from '@/lib/people';
import Link from '@/components/ui/Link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { clearUnreadCount, updateUnreadCount, useUnreadCount } from '@/lib/client/notifications';
import { onLive } from '@/lib/client/liveFeed';
import { aimAtCard, dateAtTop } from '@/lib/client/returnSpot';
import { refreshLocalWeather, requestLocalWeather, useLocalWeather } from '@/lib/client/localWeather';
import { formatLocalWeather, usesImperial } from '@/lib/weather';
import { timeAgo } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import { ALERT_SOON_MINUTES } from '@/lib/alerts';
import { term } from '@/lib/searchTerms';
import { useIntlLocale, useT } from '@/lib/client/i18n';
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
  personName: string | null;
  personPhotoUrl: string | null;
  tradeFiledDate: string | null;
  tradeCount: number | null;
  tradeTickers: string[] | null;
  tradeBuys: number | null;
  tradeSells: number | null;
  tradeBuyTickers: string[] | null;
  tradeSellTickers: string[] | null;
  tradeBuyValues: Record<string, number> | null;
  tradeSellValues: Record<string, number> | null;
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
    case 'start':
    case 'soon':
    case 'update':
      return { icon: 'eye', label: t('notifications.whyWatch') };
    case 'thread':
      return { icon: 'eye', label: t('notifications.whyThread') };
    case 'trade':
      return n.personName ? { icon: 'eye', label: t('notifications.whyTrade', { name: n.personName }), href: `${personPath(n.personName)}#trades` } : null;
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
function useNotificationList(active: boolean) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const res = await api.get<{ notifications: Notification[]; unreadCount: number }>('/api/notifications');
      setFailed(false);
      setItems(res.notifications);
      updateUnreadCount(res.unreadCount);
    } catch {
      setFailed(true);
      loading.current = false;
      return;
    }
    try {
      await api.post('/api/notifications/read');
      clearUnreadCount();
    } catch {
      // Keep the loaded list and unread badge when marking read fails.
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const initialLoad = window.setTimeout(() => void load(), 0);
    const stop = onLive<{ unreadCount: number }>('notifications', ({ unreadCount }) => {
      if (unreadCount > 0) void load();
    });
    return () => {
      window.clearTimeout(initialLoad);
      stop();
    };
  }, [active, load]);

  async function followBack(n: Notification) {
    setPending((p) => ({ ...p, [n.actor.id]: true }));
    try {
      await api.post(`/api/users/${n.actor.id}/follow`);
      setItems((list) => list?.map((item) => (item.actor.id === n.actor.id ? { ...item, followingBack: true } : item)) ?? null);
    } finally {
      setPending((p) => ({ ...p, [n.actor.id]: false }));
    }
  }

  return { items, failed, pending, load, followBack };
}

// The face at the left of a row: a mark of its own for a watched pin landing
// today, starting or about to, or updated, the company's logo for one of its pins (its
// author's avatar would look like the pin came from them), otherwise the actor.
// A batch wears the number it stands for, so a run of pins is countable
// straight down the left edge.
function NotificationFace({ n, onNavigate }: { n: Notification; onNavigate?: () => void }) {
  const handle = n.actor.userName.replace(/^@+/, '');
  const face =
    n.type === 'today' || n.type === 'start' || n.type === 'soon' || n.type === 'update' || n.type === 'thread' ? (
      <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-tag-today/15 text-tag-today">
        <Icon name="target" className="size-4" />
      </span>
    ) : n.type === 'trade' && n.personName ? (
      <Link href={`${personPath(n.personName)}#trades`} onClick={onNavigate}>
        {n.personPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- portraits from arbitrary hosts
          <img src={n.personPhotoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-8 rounded-full bg-raised object-cover" />
        ) : (
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-raised text-muted">
            <Icon name="users" className="size-4" />
          </span>
        )}
      </Link>
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
          className="absolute -end-1.5 -bottom-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold tabular-nums text-white ring-2 ring-panel"
        >
          {n.groupCount > 99 ? '99+' : n.groupCount}
        </span>
      ) : null}
    </span>
  );
}

// The sections the list is sorted into, by why the notification reached the
// viewer: people and companies they follow, pins and threads they watch, and
// what happened to their own pins and comments. Each section keeps the
// server's newest-first order, and the sections themselves run by whichever
// holds the newest notification, so the top of the list is still the latest.
type Section = 'following' | 'watching' | 'yours';

function sectionOf(type: string): Section {
  switch (type) {
    case 'today':
    case 'start':
    case 'soon':
    case 'update':
    case 'thread':
    case 'trade':
      return 'watching';
    case 'comment':
    case 'reply':
    case 'reference':
      return 'yours';
    default:
      return 'following';
  }
}

function sectionsOf(items: Notification[]): { section: Section; items: Notification[] }[] {
  const sections: { section: Section; items: Notification[] }[] = [];
  for (const n of items) {
    const section = sectionOf(n.type);
    const found = sections.find((s) => s.section === section);
    if (found) found.items.push(n);
    else sections.push({ section, items: [n] });
  }
  return sections;
}

type Entry = { kind: 'row'; n: Notification } | { kind: 'trades'; groups: { day: number; items: Notification[] }[] };

// Stock-trade rows fold into one group per day (today, yesterday), placed where
// the newest of each sits; older filings drop out.
const dayKey = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function entriesOf(allRows: Notification[]): Entry[] {
  const days = [[0, dayKey(0)], [-1, dayKey(-1)]] as const;
  const dayOf = (n: Notification) => days.find(([, k]) => n.tradeFiledDate?.slice(0, 10) === k)?.[0];
  const rows = allRows.filter((n) => n.type !== 'trade' || dayOf(n) !== undefined);
  const entries: Entry[] = [];
  let placed = false;
  for (const n of rows) {
    if (n.type !== 'trade') entries.push({ kind: 'row', n });
    else if (!placed) {
      placed = true;
      const groups = days
        .map(([day]) => ({ day, items: rows.filter((r) => r.type === 'trade' && dayOf(r) === day) }))
        .filter((g) => g.items.length);
      entries.push({ kind: 'trades', groups });
    }
  }
  return entries;
}

// The watched people's recent trades, collapsed to buy and sell totals with
// their tickers (every row below counts, so the tiles always add up); opening it lists each filing.
function TradeDay({ items, day, renderRow }: { items: Notification[]; day: number; renderRow: (n: Notification) => React.ReactNode }) {
  const t = useT();
  const locale = useIntlLocale();
  const dayLabel = day >= -1
    ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(day, 'day')
    : new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }).format(dayDate(day));
  const [open, setOpen] = useState(false);
  const listId = useId();
  const sum = (pick: (n: Notification) => number | null) => items.reduce((total, n) => total + (pick(n) ?? 0), 0);
  // Tickers ranked by how many people traded them, then by total dollar value.
  const tickers = (pick: (n: Notification) => Record<string, number> | null) => {
    const stats = new Map<string, { people: Set<string>; value: number }>();
    for (const n of items) {
      for (const [ticker, value] of Object.entries(pick(n) ?? {})) {
        const s = stats.get(ticker) ?? { people: new Set<string>(), value: 0 };
        s.people.add(n.personName ?? String(n.id));
        s.value += value;
        stats.set(ticker, s);
      }
    }
    return [...stats].sort((a, b) => b[1].people.size - a[1].people.size || b[1].value - a[1].value).map(([ticker, s]) => [ticker, s.people.size] as const);
  };
  const tiles = [
    ['tradeBuys', sum((n) => n.tradeBuys), tickers((n) => n.tradeBuyValues), 'text-success-soft ring-success/40'],
    ['tradeSells', sum((n) => n.tradeSells), tickers((n) => n.tradeSellValues), 'text-danger-soft ring-danger/40'],
  ] as const;
  return (
    <div className="text-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-1.5 px-4 py-2.5 text-start"
      >
        <span className="flex items-center justify-between gap-2 font-semibold text-ink">
          {dayLabel}
          <Icon name="chevron" className={`size-4 shrink-0 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
        <span className="grid grid-cols-2 gap-2">
          {tiles.map(([key, count, all, tone]) => {
            // Collapsed: only tickers more than one person traded.
            const list = open ? all : all.filter(([, people]) => people > 1);
            return (
            <span key={key} className={`flex min-w-0 flex-col rounded-lg bg-field px-2.5 py-1.5 ring-1 ring-inset ${count ? tone : 'text-subtle ring-line'}`}>
              <span className="flex items-baseline justify-between gap-2 text-xs font-medium">
                {t(`notifications.${key}`)}
                <span className="text-base font-semibold tabular-nums">{count}</span>
              </span>
              {list.length ? (
                <span className="mt-0.5 grid grid-cols-1 text-[11px] text-muted">
                  {list.map(([ticker, people]) => (
                    <span key={ticker} className="flex min-w-0 items-baseline gap-1.5">
                      <span className="w-4 shrink-0 text-end tabular-nums">{people}</span>
                      <span className="truncate font-medium text-ink">{ticker}</span>
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            );
          })}
        </span>
      </button>
      {open ? <ul id={listId} className="divide-y divide-line border-t border-line">{items.map(renderRow)}</ul> : null}
    </div>
  );
}

// One collapsible block holding today's and yesterday's panes stuck together.
function TradeGroup({ groups, renderRow }: { groups: { day: number; items: Notification[] }[]; renderRow: (n: Notification) => React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  return (
    <li className="text-sm">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 text-start font-semibold text-ink"
        >
          {t('notifications.tradesToday')}
        </button>
        <Link href="/notifications/trades" className="shrink-0 text-xs font-medium text-link">
          {t('notifications.tradesHistory')}
        </Link>
        <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen((o) => !o)} className="ms-auto shrink-0">
          <Icon name="chevron" className={`size-4 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open ? (
        <div id={bodyId} className="divide-y divide-line border-t border-line">
          {groups.map((g) => <TradeDay key={g.day} items={g.items} day={g.day} renderRow={renderRow} />)}
        </div>
      ) : null}
    </li>
  );
}

function NotificationItems({
  items,
  failed,
  load,
  pending,
  followBack,
  onNavigate,
  listClassName = '',
}: ReturnType<typeof useNotificationList> & { onNavigate?: () => void; listClassName?: string }) {
  const t = useT();
  const headingId = useId();
  if (failed) return (
    <div role="alert" className="px-4 py-6 text-center text-sm text-subtle">
      {t('common.somethingWrong')}{' '}
      <button type="button" className="text-link" onClick={() => void load()}>{t('common.retry')}</button>
    </div>
  );
  if (items === null) return <div className="px-4 py-6 text-center text-sm text-subtle">{t('common.loading')}</div>;
  if (items.length === 0) return <div className="px-4 py-6 text-center text-sm text-subtle">{t('notifications.empty')}</div>;
  const labels: Record<Section, string> = {
    following: t('notifications.following'),
    watching: t('notifications.groupWatching'),
    yours: t('notifications.groupYours'),
  };
  const renderRow = (n: Notification) => {
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
                    ) : (n.type === 'start' || n.type === 'soon') && n.pinId ? (
                      <Link href={pinPath({ id: n.pinId, title: n.pinTitle ?? '' })} className="block text-ink" onClick={onNavigate}>
                        {n.type === 'start'
                          ? t.rich('notifications.start', { pin: () => <span className="font-semibold">{n.pinTitle}</span> })
                          : t.rich('notifications.soon', { minutes: ALERT_SOON_MINUTES, pin: () => <span className="font-semibold">{n.pinTitle}</span> })}
                      </Link>
                    ) : n.type === 'update' && n.pinId ? (
                      <Link href={`${pinPath({ id: n.pinId, title: n.pinTitle ?? '' })}#updates`} className="block text-ink" onClick={onNavigate}>
                        {t.rich('notifications.update', { pin: () => <span className="font-semibold">{n.pinTitle}</span> })}
                      </Link>
                    ) : n.type === 'trade' && n.personName ? (
                      <Link href={`${personPath(n.personName)}#trades`} className="block text-ink" onClick={onNavigate}>
                        {t.rich('notifications.trade', {
                          count: n.tradeCount ?? 0,
                          tickers: n.tradeTickers?.length ? `: ${n.tradeTickers.slice(0, 4).join(', ')}` : '',
                          person: () => <span className="font-semibold">{n.personName}</span>,
                        })}
                        {n.tradeBuys || n.tradeSells ? (
                          <span className="mt-1.5 grid grid-cols-2 gap-2">
                            {(
                              [
                                ['tradeBuys', n.tradeBuys, n.tradeBuyTickers, 'text-success-soft ring-success/40'],
                                ['tradeSells', n.tradeSells, n.tradeSellTickers, 'text-danger-soft ring-danger/40'],
                              ] as const
                            ).map(([key, count, tickers, tone]) => (
                              <span key={key} className={`flex min-w-0 flex-col rounded-lg bg-field px-2.5 py-1.5 ring-1 ring-inset ${count ? tone : 'text-subtle ring-line'}`}>
                                <span className="flex items-baseline justify-between gap-2 text-xs font-medium">
                                  {t(`notifications.${key}`)}
                                  <span className="text-base font-semibold tabular-nums">{count ?? 0}</span>
                                </span>
                                {tickers?.length ? <span className="truncate text-[11px] text-muted">{tickers.slice(0, 4).join(', ')}</span> : null}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </Link>
                    ) : n.type === 'thread' && n.pinId ? (
                      <Link href={pinPath({ id: n.pinId, title: n.pinTitle ?? '' })} className="block text-ink" onClick={onNavigate}>
                        {t.rich('notifications.thread', { pin: () => <span className="font-semibold">{n.pinTitle}</span> })}
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
  };
  return (
    <div className={listClassName}>
      {sectionsOf(items).map(({ section, items: rows }) => (
        <section key={section} aria-labelledby={`${headingId}-${section}`}>
          <h3
            id={`${headingId}-${section}`}
            className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-1.5 text-xs font-semibold tracking-wide text-subtle uppercase"
          >
            {labels[section]}
            <span className="tabular-nums">{rows.length}</span>
          </h3>
          <ul className="divide-y divide-line">
            {entriesOf(rows).map((entry) =>
              entry.kind === 'trades' ? (
                <TradeGroup key="trades" groups={entry.groups} renderRow={renderRow} />
              ) : (
                renderRow(entry.n)
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
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
// city. A failed lookup offers a retry without requesting location access.
function LocalWeatherRow({ className = '' }: { className?: string }) {
  const { local, weather } = useFormattedLocalWeather();
  const t = useT();
  if (local.status === 'ask') {
    return (
      <button type="button" onClick={requestLocalWeather} title={t('weather.showLocalHint')} className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm text-muted hover:bg-raised hover:text-ink ${className}`}>
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
  if (local.status === 'off') {
    return (
      <div role="status" className={`px-4 py-2.5 text-sm text-subtle ${className}`}>
        {t('weather.local')}: {t('common.somethingWrong')}{' '}
        <button type="button" className="text-link" onClick={refreshLocalWeather}>{t('common.retry')}</button>
      </div>
    );
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
          <span className="ms-auto shrink-0 text-xs text-muted" title={t('weather.highLow', { unit: weather.unit })}>
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
  const t = useT();
  return (
    <span aria-hidden className={`flex shrink-0 flex-col items-start gap-0.5 leading-none ${className}`} title={weather?.summary ?? t('weather.local')}>
      <Icon name={weather?.icon ?? 'sun'} className={`size-3.5 ${weather ? 'text-warning' : 'text-muted'}`} />
      {weather?.now ? <span className="text-[10px] font-bold tabular-nums">{weather.now}</span> : null}
    </span>
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

// The curated pages, as the account menu and the phone drawer list them.
const CURATED_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/restaurants', label: 'Restaurants', icon: 'map' },
  { href: '/travel', label: 'Travel', icon: 'globe' },
  { href: '/activities', label: 'Activities', icon: 'compass' },
  { href: '/products', label: 'Products', icon: 'cart' },
  { href: '/cars', label: 'Cars', icon: 'car' },
  { href: '/music', label: 'Music', icon: 'music' },
];

// In the bell's place for visitors who are not signed in (lg and up): the
// weather icon, with the weather row in a panel under it. Keep the menu
// accessible even when weather or location is unavailable.
export function WeatherButton({ className = '' }: { className?: string }) {
  const { open, setOpen, rootRef } = useDropdown();
  const { weather } = useFormattedLocalWeather();
  const t = useT();

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
        aria-label={weather?.summary ?? t('weather.local')}
        title={weather?.summary ?? t('weather.local')}
        className="flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-muted hover:bg-raised hover:text-ink"
      >
        <Icon name={weather?.icon ?? 'sun'} className={`size-5 ${weather ? 'text-warning' : 'text-muted'}`} />
        {weather?.now ? <span className="text-[10px] leading-none font-medium">{weather.now}</span> : null}
      </button>
      {open ? (
        <div className="floating absolute end-0 z-50 mt-2 w-80 overflow-hidden">
          <LocalWeatherRow className={weather ? 'border-b border-line' : ''} />
          <ul className="pt-1.5">
            <li className="px-1.5">
              <Link href="/people" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-ink hover:bg-raised hover:no-underline">
                <Icon name="users" className="size-4 text-muted" />
                People
              </Link>
            </li>
          </ul>
          <div className="px-4 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider text-subtle uppercase">Curated</div>
          <ul className="pb-1.5">
            {CURATED_LINKS.map((item) => (
              <li key={item.href} className="px-1.5">
                <Link href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-ink hover:bg-raised hover:no-underline">
                  <Icon name={item.icon} className="size-4 text-muted" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// The navbar bell (lg and up), with the list in a panel under it.
export function NotificationBell({ className = '' }: { className?: string }) {
  const { open, setOpen, rootRef } = useDropdown();
  const count = useUnreadCount(true);
  const list = useNotificationList(open);
  const t = useT();
  const { weather } = useFormattedLocalWeather();

  function toggle() {
    setOpen(!open);
    if (!open) {
      refreshLocalWeather();
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unreadLabel(t, count)} title={weather ? `${t('notifications.title')} · ${weather.summary}` : t('notifications.title')} className="group/nav flex h-9 items-center gap-0.5 rounded-lg px-2 text-muted hover:bg-raised hover:text-ink">
        <WeatherPeek />
        <span className="relative flex">
          <Icon name="bell" className="size-5 origin-top group-hover/nav:animate-ring motion-reduce:animate-none" />
          <UnreadBadge count={count} className="-top-1 -end-1.5" />
        </span>
      </button>
      {open ? (
        <div className="floating absolute end-0 z-50 mt-2 w-80 overflow-hidden">
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
export function DrawerNotifications({ className, current, onClick }: { className: string; current: boolean; onClick?: () => void }) {
  const count = useUnreadCount(true);
  const t = useT();
  return (
    <Link href="/notifications" aria-current={current ? 'page' : undefined} aria-label={unreadLabel(t, count)} onClick={onClick} className={className}>
      <span className="relative flex">
        <Icon name="bell" className="size-6" />
        <UnreadBadge count={count} className="-top-1.5 -end-2" />
      </span>
      {t('notifications.title')}
      <WeatherPeek className="ms-auto text-muted" />
    </Link>
  );
}

// The /notifications page: the whole list, loaded (and marked read) on arrival.
export function NotificationsFeed() {
  const list = useNotificationList(true);
  return (
    <div className="surface overflow-hidden">
      <LocalWeatherRow className="border-b border-line" />
      <NotificationItems {...list} />
    </div>
  );
}

const HISTORY_WEEKS = [1, 2, 4, 8, 12];
const TOP_TICKERS = 10;

const dayDate = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

// The /notifications/trades page: each day's buys and sells for the past two
// weeks. Read-only, so unlike the main list it leaves the unread marks alone.
export function TradesHistoryFeed() {
  const t = useT();
  const locale = useIntlLocale();
  const [weeks, setWeeks] = useState(2);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    api
      .get<{ notifications: Notification[] }>('/api/notifications?type=trade&limit=2000')
      .then((res) => setItems(res.notifications))
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, [load]);
  if (failed) return (
    <div role="alert" className="surface px-4 py-6 text-center text-sm text-subtle">
      {t('common.somethingWrong')}{' '}
      <button type="button" className="text-link" onClick={load}>{t('common.retry')}</button>
    </div>
  );
  if (items === null) return <div className="surface px-4 py-6 text-center text-sm text-subtle">{t('common.loading')}</div>;
  const days = Array.from({ length: weeks * 7 }, (_, i) => ({
    day: -i,
    items: items.filter((n) => n.tradeFiledDate?.slice(0, 10) === dayKey(-i)),
  })).filter((g) => g.items.length);
  if (!days.length) return <div className="surface px-4 py-10 text-center text-sm text-subtle">{t('notifications.empty')}</div>;
  const sum = (rows: Notification[], pick: (n: Notification) => number | null) => rows.reduce((total, n) => total + (pick(n) ?? 0), 0);
  const all = days.flatMap((g) => g.items);
  const people = new Set(all.map((n) => n.personName)).size;
  const tone = { tradeBuys: 'text-success-soft ring-success/40', tradeSells: 'text-danger-soft ring-danger/40' } as const;
  const dayLabel = (day: number) =>
    day >= -1
      ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(day, 'day')
      : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(dayDate(day));
  const dateLabel = (day: number) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(dayDate(day));
  // Per ticker: how many people traded it and the midpoint dollar value, ranked like the bell.
  const rank = (pick: (n: Notification) => Record<string, number> | null) => {
    const stats = new Map<string, { people: Set<string>; value: number }>();
    for (const n of all) {
      for (const [ticker, value] of Object.entries(pick(n) ?? {})) {
        const st = stats.get(ticker) ?? { people: new Set<string>(), value: 0 };
        st.people.add(n.personName ?? String(n.id));
        st.value += value;
        stats.set(ticker, st);
      }
    }
    return [...stats].sort((a, b) => b[1].people.size - a[1].people.size || b[1].value - a[1].value);
  };
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
  const total = (values: Record<string, number> | null) => Object.values(values ?? {}).reduce((a, b) => a + b, 0);
  const weekLabel = (w: number) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'week', unitDisplay: 'narrow' }).format(w);
  const chips = (tickers: string[] | null, cls: string) =>
    tickers?.map((tk) => <span key={tk} className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{tk}</span>);
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t('notifications.tradesToday')} className="surface flex gap-1 p-1">
        {HISTORY_WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={w === weeks}
            onClick={() => setWeeks(w)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold tabular-nums ${w === weeks ? 'bg-accent text-white' : 'text-muted hover:bg-raised hover:text-ink'}`}
          >
            {weekLabel(w)}
          </button>
        ))}
      </div>
      <div className="surface grid grid-cols-3 divide-x divide-line rtl:divide-x-reverse">
        {([
          ['tradeBuys', sum(all, (n) => n.tradeBuys)],
          ['tradeSells', sum(all, (n) => n.tradeSells)],
        ] as const).map(([key, count]) => (
          <div key={key} className="flex flex-col items-center gap-0.5 px-2 py-4">
            <span className={`text-3xl font-semibold tabular-nums ${count ? tone[key].split(' ')[0] : 'text-subtle'}`}>{count}</span>
            <span className="text-xs font-medium tracking-wide text-subtle uppercase">{t(`notifications.${key}`)}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-0.5 px-2 py-4">
          <span className="text-3xl font-semibold text-ink tabular-nums">{people}</span>
          <Icon name="users" className="size-4 text-subtle" />
        </div>
      </div>
      <div className="surface grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
        {([
          ['tradeBuys', rank((n) => n.tradeBuyValues)],
          ['tradeSells', rank((n) => n.tradeSellValues)],
        ] as const).map(([key, list]) => (
          <div key={key} className="min-w-0 px-4 py-3">
            <h2 className={`mb-1.5 text-xs font-semibold tracking-wide uppercase ${tone[key].split(' ')[0]}`}>{t(`notifications.${key}`)}</h2>
            {list.length ? (
              <ol className="flex flex-col gap-1 text-sm">
                {list.slice(0, TOP_TICKERS).map(([ticker, st]) => (
                  <li key={ticker} className="flex items-baseline gap-2">
                    <span className="w-5 shrink-0 text-end text-xs tabular-nums text-subtle">{st.people.size}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{ticker}</span>
                    {st.value ? <span className="text-xs tabular-nums text-muted">{money.format(st.value)}</span> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <span className="text-sm text-subtle">—</span>
            )}
          </div>
        ))}
      </div>
      {days.map((g) => (
        <section key={g.day} className="surface overflow-hidden">
          <header className="flex items-baseline justify-between gap-2 border-b border-line bg-raised/40 px-4 py-2.5">
            <h2 className="font-semibold text-ink capitalize">{dayLabel(g.day)}</h2>
            <span className="flex items-center gap-3 text-xs tabular-nums text-subtle">
              <span className="text-success-soft">{t('notifications.tradeBuys')} {sum(g.items, (n) => n.tradeBuys)} · {money.format(sum(g.items, (n) => total(n.tradeBuyValues)))}</span>
              <span className="text-danger-soft">{t('notifications.tradeSells')} {sum(g.items, (n) => n.tradeSells)} · {money.format(sum(g.items, (n) => total(n.tradeSellValues)))}</span>
              <span>{dateLabel(g.day)}</span>
            </span>
          </header>
          <ul className="divide-y divide-line">
            {g.items.map((n) => (
              <li key={n.id}>
                <Link href={`${personPath(n.personName ?? '')}#trades`} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-raised/50">
                  {n.personPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- portraits from arbitrary hosts
                    <img src={n.personPhotoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full bg-raised object-cover" />
                  ) : (
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-muted">
                      <Icon name="users" className="size-5" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="truncate font-semibold text-ink">{n.personName}</span>
                    <span className="flex flex-wrap items-center gap-1">
                      {chips(n.tradeBuyTickers, 'bg-success/15 text-success-soft')}
                      {chips(n.tradeSellTickers, 'bg-danger/15 text-danger-soft')}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1.5 text-xs font-semibold tabular-nums">
                    {total(n.tradeBuyValues) ? <span className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${tone.tradeBuys}`}>{money.format(total(n.tradeBuyValues))}</span> : null}
                    {total(n.tradeSellValues) ? <span className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${tone.tradeSells}`}>{money.format(total(n.tradeSellValues))}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
