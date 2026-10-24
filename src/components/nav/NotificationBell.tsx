'use client';

import { personPath } from '@/lib/people';
import Link from '@/components/ui/Link';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  tradeBuyAssets: string[] | null;
  tradeSellAssets: string[] | null;
  tradeBuyOtherValue: number | null;
  tradeSellOtherValue: number | null;
  tradeConflicts: { ticker: string; committee: string; sector: string }[] | null;
  utcCreatedDateTime: string;
  read: boolean;
  groupCount: number;
  groupDay: string;
  pinIds: number[];
  pinStarts: string[];
  pinTitles?: string[];
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
const tickerHref = (ticker: string) => `/search?q=${encodeURIComponent(term('ticker', ticker))}`;
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
  return `/search?q=${encodeURIComponent(q)}&sort=date`;
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

// Where a section's "See more" leads: its pins on the timeline, newest by date,
// named by id like a batch. A section with no pins in it (trades, say) has no
// link; the cap keeps the URL a sane length.
function sectionHref(rows: Notification[]): string | null {
  const ids = [...new Set(rows.flatMap((n) => (n.pinIds?.length ? n.pinIds : n.pinId ? [n.pinId] : [])))].slice(0, 200);
  return ids.length ? `/search?q=${encodeURIComponent(term('pin', ids.join(',')))}&sort=date` : null;
}

// Where a new-pin row leads: the pin itself, or, for a batch, the search
// holding its pins, opened on the nearest of them.
function PinRowLink({ n, onNavigate, children }: { n: Notification; onNavigate?: () => void; children: React.ReactNode }) {
  const href = n.groupCount > 1 ? batchHref(n) : pinPath({ id: n.pinId!, title: n.pinTitle ?? '' });
  return (
    <>
      <Link
        href={href}
        className={n.groupCount > 1 ? '-mx-2 block rounded-md px-2 py-1.5 text-ink hover:bg-raised' : 'block text-ink'}
        onClick={() => {
          if (n.groupCount > 1) aimBatch(n, href);
          onNavigate?.();
        }}
      >
        {children}
      </Link>
      {n.groupCount > 1 && n.pinTitles?.length ? (
        <ul className="-mx-2 mt-1">
          {n.pinTitles.slice(0, 3).map((title, i) => (
            <li key={n.pinIds[i] ?? i}>
              <Link
                href={pinPath({ id: n.pinIds[i], title })}
                className="block truncate rounded-md px-2 py-1.5 text-sm text-muted hover:bg-raised hover:text-ink"
                onClick={onNavigate}
              >
                {title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
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
// "Possible conflict of interest": the filing trades a sector one of the member's committees oversees.
function ConflictBadge({ n }: { n: Notification }) {
  const t = useT();
  if (!n.tradeConflicts?.length) return null;
  const committees = [...new Set(n.tradeConflicts.map((c) => c.committee.split(': ')[0].replace(/^(House|Senate|Joint) (Select )?Committee on (the )?/, '')))].slice(0, 3).join(', ');
  const tickers = [...new Set(n.tradeConflicts.map((c) => c.ticker))].slice(0, 4).join(', ');
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 self-start rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-soft ring-1 ring-warning/40 ring-inset"
      title={t('notifications.conflictHint', { tickers, committees })}
    >
      <Icon name="warning" className="size-3 shrink-0" />
      <span className="truncate">{t('notifications.conflict')}: {committees}</span>
    </span>
  );
}

function TradeDay({ items, day, renderRow, expanded, wide }: { items: Notification[]; day: number; renderRow: (n: Notification) => React.ReactNode; expanded?: boolean; wide?: boolean }) {
  const t = useT();
  const locale = useIntlLocale();
  const dayLabel = day >= -1
    ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(day, 'day')
    : new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }).format(dayDate(day));
  const [openState, setOpen] = useState(false);
  // A controlled day (expanded given) has no control of its own: its group sets it.
  const open = expanded ?? openState;
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
  // Tickers a filing trades inside a sector one of the member's committees oversees.
  const conflicts = new Map<string, Set<string>>();
  for (const n of items) {
    for (const c of n.tradeConflicts ?? []) {
      const set = conflicts.get(c.ticker) ?? new Set<string>();
      set.add(c.committee.split(': ')[0].replace(/^(House|Senate|Joint) (Select )?Committee on (the )?/, ''));
      conflicts.set(c.ticker, set);
    }
  }
  const tiles = [
    ['tradeBuys', sum((n) => n.tradeBuys), tickers((n) => n.tradeBuyValues), 'text-success-soft ring-success/40'],
    ['tradeSells', sum((n) => n.tradeSells), tickers((n) => n.tradeSellValues), 'text-danger-soft ring-danger/40'],
  ] as const;
  return (
    <div className="text-sm">
      <div className="flex w-full flex-col gap-1.5 px-4 py-2.5">
        {expanded !== undefined ? (
          <span className="font-semibold text-ink">{dayLabel}</span>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between gap-2 text-start font-semibold text-ink"
          >
            {dayLabel}
            <Icon name="chevron" className={`size-4 shrink-0 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        <span className="grid grid-cols-2 gap-2">
          {tiles.map(([key, count, all, tone]) => {
            // Collapsed: only tickers more than one person traded.
            const list = open ? all : all.filter(([, people]) => people > 1);
            return (
            <span key={key} className={`flex min-w-0 flex-col rounded-lg bg-field px-2.5 py-1.5 ring-1 ring-inset ${count ? tone : 'text-subtle ring-line'}`}>
              <span className={`flex items-baseline justify-between gap-2 font-medium ${wide ? 'text-sm' : 'text-xs'}`}>
                <span className={wide ? 'relative -top-0.5' : undefined}>{t(`notifications.${key}`)}</span>
                <span className={`font-semibold tabular-nums ${wide ? 'text-lg' : 'text-base'}`}>{count}</span>
              </span>
              {list.length ? (
                <span className={`mt-0.5 grid grid-cols-1 text-muted ${wide ? 'gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2' : 'text-[11px]'}`}>
                  {list.map(([ticker, people]) => (
                    <span key={ticker} className="flex min-w-0 items-baseline gap-1.5">
                      <span className="w-4 shrink-0 text-end tabular-nums">{people}</span>
                      {/* The ticker searches its company: the panel shows it with its stock graph. */}
                      <Link href={tickerHref(ticker)} className="truncate font-medium text-ink hover:underline">{ticker}</Link>
                      {conflicts.has(ticker) ? (
                        <span title={`${t('notifications.conflict')}: ${[...conflicts.get(ticker)!].slice(0, 3).join(', ')}`} className="ms-auto shrink-0 text-warning-soft">
                          <Icon name="warning" className="size-3" />
                          <span className="sr-only">{t('notifications.conflict')}</span>
                        </span>
                      ) : null}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
            );
          })}
        </span>
      </div>
      {open ? <ul id={listId} className={`border-t border-line ${wide ? WIDE_LIST : 'divide-y divide-line'}`}>{items.map(renderRow)}</ul> : null}
    </div>
  );
}

// One collapsible block holding today's and yesterday's panes stuck together.
function TradeGroup({ groups, renderRow, href, fixed, guest, wide }: { wide?: boolean; href: string; fixed?: boolean; guest?: boolean; groups: { day: number; items: Notification[] }[]; renderRow: (n: Notification) => React.ReactNode }) {
  const t = useT();
  // The group's one chevron expands every day; days carry no chevron of their own.
  const [openState, setOpen] = useState(!guest);
  const open = fixed || openState;
  const bodyId = useId();
  return (
    <li className="text-sm lg:col-span-full">
      <div className="flex items-center gap-2 px-4 py-2.5">
        {fixed ? (
          <span className="min-w-0 font-semibold text-ink">{t('notifications.tradesToday')}</span>
        ) : (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
            className="min-w-0 text-start font-semibold text-ink"
          >
            {t('notifications.tradesToday')}
          </button>
        )}
        <Link href={href} className="shrink-0 text-xs font-medium text-link">
          {t('notifications.tradesHistory')}
        </Link>
        {fixed ? null : (
          <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen((o) => !o)} className="ms-auto shrink-0">
            <Icon name="chevron" className={`size-4 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {/* Collapsed, each day still shows its buy and sell totals. */}
      <div id={bodyId} className="divide-y divide-line border-t border-line">
        {groups.map((g) => <TradeDay key={g.day} items={g.items} day={g.day} renderRow={renderRow} expanded={open} wide={wide} />)}
      </div>
    </li>
  );
}

// The full page's list on a wide screen: up to two columns of rows,
// a few rows filling the width, the trades group across all. The list is pulled a pixel past
// the card so the last row and column draw no border against its edge.
const WIDE_LIST =
  'divide-y divide-line lg:-mb-px lg:-me-px lg:grid lg:grid-cols-[repeat(auto-fit,minmax(max(24rem,45%),1fr))] lg:divide-y-0 lg:[&>li]:border-b lg:[&>li]:border-e lg:[&>li]:border-line';

function NotificationItems({
  items,
  failed,
  load,
  pending,
  followBack,
  onNavigate,
  listClassName = '',
  only,
  guest,
  controlled,
  wide,
}: ReturnType<typeof useNotificationList> & { onNavigate?: () => void; listClassName?: string; only?: Section; guest?: boolean; controlled?: boolean; wide?: boolean }) {
  const t = useT();
  const headingId = useId();
  if (failed) return (
    <div role="alert" className="px-4 py-6 text-center text-sm text-subtle">
      {t('common.somethingWrong')}{' '}
      <button type="button" className="text-link" onClick={() => void load()}>{t('common.retry')}</button>
    </div>
  );
  if (items === null) return guest ? null : <div className="px-4 py-6 text-center text-sm text-subtle">{t('common.loading')}</div>;
  if (items.length === 0 && guest) return null;
  if (items.length === 0) return <div className="px-4 py-6 text-center text-sm text-subtle">{t('notifications.empty')}</div>;
  const labels: Record<Section, string> = {
    following: t('notifications.following'),
    watching: t('notifications.groupWatching'),
    yours: t('notifications.groupYours'),
  };
  const renderRow = (n: Notification) => {
              const handle = n.actor.userName.replace(/^@+/, '');
              const reason = guest ? null : reasonOf(n, t);
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
                        {n.tradeConflicts?.length ? <span className="mt-1.5 flex"><ConflictBadge n={n} /></span> : null}
                        {n.tradeBuys || n.tradeSells ? (
                          <span className="mt-1.5 grid grid-cols-2 gap-2">
                            {(
                              [
                                ['tradeBuys', n.tradeBuys, n.tradeBuyTickers, 'text-success-soft ring-success/40'],
                                ['tradeSells', n.tradeSells, n.tradeSellTickers, 'text-danger-soft ring-danger/40'],
                              ] as const
                            ).map(([key, count, tickers, tone]) => (
                              <span key={key} className={`flex min-w-0 flex-col rounded-lg bg-field px-2.5 py-1.5 ring-1 ring-inset ${count ? tone : 'text-subtle ring-line'}`}>
                                <span className={`flex items-center justify-between gap-2 leading-none font-medium ${wide ? 'text-sm' : 'text-xs'}`}>
                                  <span className={wide ? 'relative -top-0.5' : undefined}>{t(`notifications.${key}`)}</span>
                                  <span className={`font-semibold leading-none tabular-nums ${wide ? 'text-lg' : 'text-base'}`}>{count ?? 0}</span>
                                </span>
                                {tickers?.length ? <span className={`truncate text-muted ${wide ? 'text-xs' : 'text-[11px]'}`}>{tickers.slice(0, 4).join(', ')}</span> : null}
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
      {sectionsOf(items).filter((s) => !only || s.section === only).map(({ section, items: rows }) => (
        <section key={section} aria-labelledby={`${headingId}-${section}`}>
          {guest ? null : <h3
            id={`${headingId}-${section}`}
            className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-panel px-4 py-1.5 text-xs font-semibold tracking-wide text-subtle uppercase"
          >
            {labels[section]}
            <span className="flex items-center gap-3">
              {onNavigate && sectionHref(rows) ? (
                <Link href={sectionHref(rows)!} className="text-xs font-medium tracking-normal text-link normal-case" onClick={onNavigate}>
                  {t('notifications.tradesHistory')}
                </Link>
              ) : null}
              <span className="tabular-nums">{rows.length}</span>
            </span>
          </h3>}
          <ul className={wide ? WIDE_LIST : 'divide-y divide-line'}>
            {entriesOf(rows).map((entry) =>
              entry.kind === 'trades' ? (
                <TradeGroup key="trades" wide={wide} groups={entry.groups} renderRow={renderRow} fixed={controlled} guest={guest} href={guest ? '/trades' : '/notifications/trades'} />
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

// The recent stock trades a visitor sees without signing in: everyone's
// filings, on by default where a signed-in viewer must watch people first.
function usePublicTrades(active: boolean) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await api.get<{ notifications: Notification[] }>('/api/trades/recent');
      setFailed(false);
      setItems(res.notifications);
    } catch {
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [active, load]);
  return { items, failed, pending: {}, load, followBack: async () => {} };
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
  const trades = usePublicTrades(open);
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
        <div className="floating absolute end-0 z-50 mt-2 flex max-h-[calc(100dvh-5rem)] w-80 flex-col overflow-hidden">
          <LocalWeatherRow className="shrink-0" />
          {/* Only what is under the weather row scrolls, as under the bell's heading. */}
          <div className="min-h-0 overflow-y-auto">
          <div className="peer border-b border-line empty:hidden"><NotificationItems {...trades} guest onNavigate={() => setOpen(false)} /></div>
          <ul className={`pt-1.5 ${weather ? 'peer-empty:border-t peer-empty:border-line' : ''}`}>
            <li className="px-1.5">
              <Link href="/people" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-ink hover:bg-raised hover:no-underline">
                <Icon name="users" className="size-4 text-muted" />
                People
              </Link>
            </li>
            <li className="px-1.5">
              <Link href="/trades" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-ink hover:bg-raised hover:no-underline">
                <Icon name="trending-up" className="size-4 text-muted" />
                {t('notifications.tradesToday')}
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
        </div>
      ) : null}
    </div>
  );
}

// The weather for visitors who are not signed in, in the phone drawer: the
// weather row over the recent trades, which it opens in full or shuts.
export function DrawerWeather({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);
  const trades = usePublicTrades(open);
  useEffect(() => {
    refreshLocalWeather();
  }, []);
  return (
    <>
      {/* The weather block is the one control: it opens every trade panel in
          full, or shuts them all. It sticks under the drawer's head while the
          rest scrolls, so its section is `contents` and the nav is what it
          sticks within. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={`sticky top-[52px] z-10 flex cursor-pointer items-center border-t border-line bg-header px-2 pt-2.5 pb-1 hover:bg-raised ${open ? 'border-b' : ''}`}
      >
        <LocalWeatherRow className="min-w-0 flex-1" />
        <Icon name="chevron" className={`me-4 size-4 shrink-0 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open ? (
        <div className="px-2 pb-2.5">
          <NotificationItems {...trades} guest controlled onNavigate={onNavigate} />
        </div>
      ) : null}
    </>
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
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-b border-line px-4 py-2.5 text-sm font-semibold text-ink hover:bg-raised hover:no-underline">
            {t('notifications.title')}
          </Link>
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
      <NotificationItems {...list} wide />
    </div>
  );
}

const HISTORY_WEEKS = [1, 2, 4, 8, 12];
const TOP_TICKERS = 12;

const dayDate = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

// The /notifications/trades page: each day's buys and sells for the past two
// weeks. Read-only, so unlike the main list it leaves the unread marks alone.
export function TradesHistoryFeed({ everyone, wide }: { everyone?: boolean; wide?: boolean }) {
  const t = useT();
  const locale = useIntlLocale();
  const [weeks, setWeeks] = useState(2);
  const [allTickers, setAllTickers] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    api
      .get<{ notifications: Notification[] }>(everyone ? '/api/trades/recent?days=84' : '/api/notifications?type=trade&limit=2000')
      .then((res) => setItems(res.notifications))
      .catch(() => setFailed(true));
  }, [everyone]);
  useEffect(() => {
    const id = window.setTimeout(load, 0);
    return () => window.clearTimeout(id);
  }, [load]);
  // The days shown and the ticker rankings, recomputed only when the data or the span changes.
  const { days, all, ranked, conflicts } = useMemo(() => {
    const rows = items ?? [];
    const days = Array.from({ length: weeks * 7 }, (_, i) => ({
      day: -i,
      items: rows.filter((n) => n.tradeFiledDate?.slice(0, 10) === dayKey(-i)),
    })).filter((g) => g.items.length);
    const all = days.flatMap((g) => g.items);
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
    // Tickers a filing trades inside a sector one of the member's committees oversees.
    const conflicts = new Map<string, Set<string>>();
    for (const n of all) {
      for (const c of n.tradeConflicts ?? []) {
        const set = conflicts.get(c.ticker) ?? new Set<string>();
        set.add(c.committee.split(': ')[0].replace(/^(House|Senate|Joint) (Select )?Committee on (the )?/, ''));
        conflicts.set(c.ticker, set);
      }
    }
    return { days, all, conflicts, ranked: { buys: rank((n) => n.tradeBuyValues), sells: rank((n) => n.tradeSellValues) } };
  }, [items, weeks]);
  if (failed) return (
    <div role="alert" className="surface px-4 py-6 text-center text-sm text-subtle">
      {t('common.somethingWrong')}{' '}
      <button type="button" className="text-link" onClick={load}>{t('common.retry')}</button>
    </div>
  );
  if (items === null) return <div className="surface px-4 py-6 text-center text-sm text-subtle">{t('common.loading')}</div>;
  if (!days.length) return <div className="surface px-4 py-10 text-center text-sm text-subtle">{t('notifications.empty')}</div>;
  const sum = (rows: Notification[], pick: (n: Notification) => number | null) => rows.reduce((total, n) => total + (pick(n) ?? 0), 0);
  const people = new Set(all.map((n) => n.personName)).size;
  const tone = { tradeBuys: 'text-success-soft ring-success/40', tradeSells: 'text-danger-soft ring-danger/40' } as const;
  const dayLabel = (day: number) =>
    day >= -1
      ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(day, 'day')
      : new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(dayDate(day));
  const dateLabel = (day: number) => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(dayDate(day));
  const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
  const total = (values: Record<string, number> | null, other?: number | null) => Object.values(values ?? {}).reduce((a, b) => a + b, other ?? 0);
  const weekLabel = (w: number) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'week', unitDisplay: 'narrow' }).format(w);
  const chips = (tickers: string[] | null, cls: string) =>
    // Flagged tickers first, then alphabetical.
    [...(tickers ?? [])].sort((a, b) => Number(conflicts.has(b)) - Number(conflicts.has(a)) || a.localeCompare(b)).map((tk) => (
      // Above the row's stretched person link: a ticker opens its company and stock graph.
      <Link
        key={tk}
        href={tickerHref(tk)}
        title={conflicts.has(tk) ? `${t('notifications.conflict')}: ${[...conflicts.get(tk)!].slice(0, 3).join(', ')}` : undefined}
        className={`relative inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold hover:underline ${cls}`}
      >
        {conflicts.has(tk) ? <Icon name="warning" className="size-3 shrink-0 text-warning-soft" /> : null}
        {tk}
        {conflicts.has(tk) ? <span className="sr-only">{t('notifications.conflict')}</span> : null}
      </Link>
    ));
  // Holdings with no ticker (bonds, T-bills, private companies), by name.
  const assetChips = (assets: string[] | null, side: 'buy' | 'sell') =>
    assets?.map((a) => (
      <span key={a} title={`${side === 'buy' ? t('notifications.tradeBuys') : t('notifications.tradeSells')}: ${a}`} className={`max-w-full whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${side === 'buy' ? 'bg-success/10 text-success-soft ring-success/30' : 'bg-danger/10 text-danger-soft ring-danger/30'}`}>{a}</span>
    ));
  return (
    <div className={wide ? 'flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start' : 'flex flex-col gap-4'}>
      <div role="group" aria-label={t('notifications.tradesToday')} className={`surface flex gap-1 p-1 ${wide ? 'lg:col-span-3' : ''}`}>
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
      <div className={`surface grid grid-cols-3 divide-x divide-line rtl:divide-x-reverse ${wide ? 'lg:col-span-1' : ''}`}>
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
          <span className="text-xs font-medium tracking-wide text-subtle uppercase">{t('notifications.tradePeople')}</span>
        </div>
      </div>
      <div className={`surface grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse ${wide ? 'lg:col-span-2' : ''}`}>
        {([
          ['tradeBuys', ranked.buys],
          ['tradeSells', ranked.sells],
        ] as const).map(([key, list]) => (
          <div key={key} className="min-w-0 px-4 py-3">
            <h2 className={`mb-1.5 text-xs font-semibold tracking-wide uppercase ${tone[key].split(' ')[0]}`}>{t(`notifications.${key}`)}</h2>
            {list.length ? (
              <ol className={`text-sm ${wide ? 'lg:columns-2 lg:gap-x-8' : ''}`}>
                {(allTickers ? list : list.slice(0, TOP_TICKERS)).map(([ticker, st]) => (
                  <li key={ticker} className="mb-1 flex items-baseline gap-2 break-inside-avoid">
                    <span className="w-5 shrink-0 text-end text-xs tabular-nums text-subtle">{st.people.size}</span>
                    <Link href={tickerHref(ticker)} className="min-w-0 truncate font-semibold text-ink hover:underline">{ticker}</Link>
                    {conflicts.has(ticker) ? (
                      <span title={`${t('notifications.conflict')}: ${[...conflicts.get(ticker)!].slice(0, 3).join(', ')}`} className="shrink-0 text-warning-soft">
                        <Icon name="warning" className="size-3" />
                      </span>
                    ) : null}
                    {st.value ? <span className="ms-auto text-xs tabular-nums text-muted">{money.format(st.value)}</span> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <span className="text-sm text-subtle">—</span>
            )}
          </div>
        ))}
        {ranked.buys.length > TOP_TICKERS || ranked.sells.length > TOP_TICKERS ? (
          <button
            type="button"
            aria-expanded={allTickers}
            onClick={() => setAllTickers((v) => !v)}
            className="col-span-full border-t border-line px-4 py-2 text-sm font-semibold text-accent hover:bg-raised/50 sm:col-span-2"
          >
            {allTickers ? t('common.showLess') : t('common.showMore')}
          </button>
        ) : null}
      </div>
      {days.map((g) => (
        <section key={g.day} className={`surface overflow-hidden ${wide ? 'lg:col-span-3' : ''}`}>
          <header className="flex items-baseline justify-between gap-2 border-b border-line bg-raised/40 px-4 py-2.5">
            <h2 className="font-semibold text-ink capitalize">{dayLabel(g.day)}</h2>
            <span className="flex items-center gap-3 text-xs tabular-nums text-subtle">
              <span className="text-success-soft">{t('notifications.tradeBuys')} {sum(g.items, (n) => n.tradeBuys)} · {money.format(sum(g.items, (n) => total(n.tradeBuyValues, n.tradeBuyOtherValue)))}</span>
              <span className="text-danger-soft">{t('notifications.tradeSells')} {sum(g.items, (n) => n.tradeSells)} · {money.format(sum(g.items, (n) => total(n.tradeSellValues, n.tradeSellOtherValue)))}</span>
              <span>{dateLabel(g.day)}</span>
            </span>
          </header>
          <ul className={wide ? WIDE_LIST : 'divide-y divide-line'}>
            {g.items.map((n) => (
              <li key={n.id} className="relative">
                <div className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-raised/50">
                  {n.personPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- portraits from arbitrary hosts
                    <img src={n.personPhotoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full bg-raised object-cover" />
                  ) : (
                    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-muted">
                      <Icon name="users" className="size-5" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex items-start justify-between gap-3">
                      <Link href={`${personPath(n.personName ?? '')}#trades`} className="min-w-0 truncate font-semibold text-ink after:absolute after:inset-0">{n.personName}</Link>
                      <span className="flex shrink-0 gap-1.5 text-xs font-semibold tabular-nums">
                      {total(n.tradeBuyValues, n.tradeBuyOtherValue) ? <span className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${tone.tradeBuys}`}>{money.format(total(n.tradeBuyValues, n.tradeBuyOtherValue))}</span> : null}
                      {total(n.tradeSellValues, n.tradeSellOtherValue) ? <span className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${tone.tradeSells}`}>{money.format(total(n.tradeSellValues, n.tradeSellOtherValue))}</span> : null}
                      </span>
                    </span>
                    {n.tradeBuyTickers?.length ? <span className="flex flex-wrap items-center gap-1">{chips(n.tradeBuyTickers, 'bg-success/15 text-success-soft')}</span> : null}
                    {n.tradeBuyAssets?.length ? <span className="flex flex-wrap items-center gap-1">{assetChips(n.tradeBuyAssets, 'buy')}</span> : null}
                    {n.tradeSellTickers?.length ? <span className="flex flex-wrap items-center gap-1">{chips(n.tradeSellTickers, 'bg-danger/15 text-danger-soft')}</span> : null}
                    {n.tradeSellAssets?.length ? <span className="flex flex-wrap items-center gap-1">{assetChips(n.tradeSellAssets, 'sell')}</span> : null}
                    <ConflictBadge n={n} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
