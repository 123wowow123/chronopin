'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import Link from '@/components/ui/Link';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { useIntlLocale, useT } from '@/lib/client/i18n';
import { timeAgo } from '@/lib/format';
import { personPath } from '@/lib/people';
import { pinPath } from '@/lib/seo';
import { term } from '@/lib/searchTerms';
import type { TraderPositionRow } from '@/lib/traders';
import { thumb } from './PeopleDirectory';

export type SidebarWatchedPerson = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  role: string;
  office: string | null;
  party: string | null;
  jurisdiction: string | null;
  tradeCount: number;
  lastFiledDate: string | null;
  pinCount: number;
};

export type SidebarFollowedUser = {
  id: number;
  userName: string;
  pictureUrl: string | null;
};

export type SidebarTradeNotification = {
  id: number;
  type: string;
  personName: string | null;
  personPhotoUrl: string | null;
  tradeFiling?: string | null;
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
};

export type SidebarPersonPin = {
  id: number;
  title: string;
  utcStartDateTime: string;
  utcCreatedDateTime: string;
  personId: number;
  personName: string;
  personSlug: string;
  personPhotoUrl: string | null;
  watched: boolean;
};

export type PeopleSidebarData = {
  watchingAll: boolean;
  watcherCount: number;
  watchedPeople: SidebarWatchedPerson[];
  followingUsers: {
    following: SidebarFollowedUser[];
    total: number;
    next: number | null;
  };
  watchedTrades: SidebarTradeNotification[];
  recentTrades: SidebarTradeNotification[];
  recentPins: SidebarPersonPin[];
  traderMoves: {
    locked: boolean;
    positions: TraderPositionRow[];
  };
};

const tickerHref = (ticker: string) => `/search?q=${encodeURIComponent(term('ticker', ticker))}`;
const userHref = (handle: string) => `/search?q=user:${encodeURIComponent(handle.replace(/^@+/, ''))}`;

const PREMIUM_MOVE: Record<string, 'notifications.premiumBuy' | 'notifications.premiumSell' | 'notifications.premiumHold' | 'notifications.premiumSwap'> = {
  buy: 'notifications.premiumBuy',
  sell: 'notifications.premiumSell',
  hold: 'notifications.premiumHold',
  swap: 'notifications.premiumSwap',
};

function initials(name: string): string {
  const parts = name.replace(/\(.*?\)/g, ' ').split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function SmallPersonAvatar({ name, photoUrl, size = 'size-9' }: { name: string; photoUrl: string | null; size?: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : thumb(photoUrl, 120);
  if (!src) {
    return (
      <span
        aria-hidden
        className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold tracking-wide text-subtle`}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- portraits come from Wikimedia Commons
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${size} shrink-0 rounded-full bg-raised object-cover object-top`}
    />
  );
}

function ConflictBadge({ n }: { n: SidebarTradeNotification }) {
  const t = useT();
  if (!n.tradeConflicts?.length) return null;
  const committees = [
    ...new Set(
      n.tradeConflicts.map((c) =>
        c.committee.split(': ')[0].replace(/^(House|Senate|Joint) (Select )?Committee on (the )?/, ''),
      ),
    ),
  ]
    .slice(0, 3)
    .join(', ');
  const tickers = [...new Set(n.tradeConflicts.map((c) => c.ticker))].slice(0, 4).join(', ');
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 self-start rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-soft ring-1 ring-warning/40 ring-inset"
      title={t('notifications.conflictHint', { tickers, committees })}
    >
      <Icon name="warning" className="size-3 shrink-0" />
      <span className="truncate">
        {t('notifications.conflict')}: {committees}
      </span>
    </span>
  );
}

function WatchedPersonRow({
  person,
  watching,
  onToggle,
}: {
  person: SidebarWatchedPerson;
  watching: boolean;
  onToggle: (personId: number, next: boolean) => Promise<void>;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const roleLabel = t.dynamic(`person.roles.${person.role}`, person.role);
  const subtitle = [person.office || roleLabel, person.party, person.jurisdiction].filter(Boolean).join(' · ');

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await onToggle(person.id, !watching);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <Link href={`/person/${person.slug}`} className="shrink-0">
        <SmallPersonAvatar name={person.name} photoUrl={person.photoUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/person/${person.slug}`} className="block truncate font-semibold text-ink hover:text-link hover:no-underline">
          {person.name}
        </Link>
        {subtitle ? <div className="truncate text-xs text-muted">{subtitle}</div> : null}
        {person.tradeCount > 0 || person.pinCount > 0 ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle">
            {person.tradeCount > 0 ? (
              <Link href={`/person/${person.slug}#trades`} className="font-medium text-subtle hover:text-ink">
                {t('person.trades.title')}: {person.tradeCount}
                {person.lastFiledDate ? ` · ${person.lastFiledDate}` : ''}
              </Link>
            ) : null}
            {person.pinCount > 0 ? (
              <span>{t('search.pinCount', { count: person.pinCount })}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={watching}
        title={t(watching ? 'person.trades.unwatchHint' : 'person.trades.watchHint', { name: person.name })}
        className={`btn shrink-0 rounded-full px-3 py-1 text-xs ${
          watching ? 'btn-secondary hover:bg-red-500/15 hover:text-danger-soft hover:ring-red-500/30' : 'btn-primary'
        }`}
      >
        {t(watching ? 'follow.unfollow' : 'follow.follow')}
      </button>
    </li>
  );
}

function FollowedUserRow({ user }: { user: SidebarFollowedUser }) {
  const t = useT();
  const [following, setFollowing] = useState(true);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (following) await api.delete(`/api/users/${user.id}/follow`);
      else await api.post(`/api/users/${user.id}/follow`);
      setFollowing(!following);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-2 text-sm">
      <Link href={userHref(user.userName)} className="shrink-0">
        <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-8 text-xs" />
      </Link>
      <Link href={userHref(user.userName)} className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-link hover:no-underline">
        {user.userName}
      </Link>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        title={t(following ? 'follow.unfollowName' : 'follow.followName', { name: user.userName })}
        className={`btn shrink-0 rounded-full px-3 py-1 text-xs ${
          following ? 'btn-secondary hover:text-danger-soft' : 'btn-primary'
        }`}
      >
        {t(following ? 'follow.unfollow' : 'follow.follow')}
      </button>
    </li>
  );
}

const INITIAL_PEOPLE = 6;
const INITIAL_TRADES = 5;

export function PeopleSidePanel({
  data,
  failed,
  onRetry,
  unwatchedIds,
  onTogglePersonWatch,
  filteringWatched,
  onToggleFilterWatched,
}: {
  data: PeopleSidebarData | null;
  failed: boolean;
  onRetry: () => void;
  unwatchedIds: Set<number>;
  onTogglePersonWatch: (personId: number, nextWatching: boolean) => Promise<void>;
  filteringWatched?: boolean;
  onToggleFilterWatched?: () => void;
}) {
  const t = useT();
  const locale = useIntlLocale();
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [tradeScope, setTradeScope] = useState<'watched' | 'all' | null>(null);

  if (failed) {
    return (
      <aside aria-label={t('profile.following')} className="space-y-4">
        <div role="alert" className="floating px-4 py-6 text-center text-sm text-subtle">
          {t('common.somethingWrong')}{' '}
          <button type="button" className="font-medium text-link hover:underline" onClick={onRetry}>
            {t('common.retry')}
          </button>
        </div>
      </aside>
    );
  }

  if (!data) {
    return (
      <aside aria-label={t('profile.following')} className="space-y-4">
        <div className="floating px-4 py-8 text-center text-sm text-subtle">{t('common.loading')}</div>
      </aside>
    );
  }

  const activeWatchedCount = data.watchedPeople.filter((p) => !unwatchedIds.has(p.id)).length;
  const hasWatchedTrades = data.watchedTrades.length > 0;
  const effectiveScope: 'watched' | 'all' = tradeScope ?? (hasWatchedTrades ? 'watched' : 'all');
  const trades = effectiveScope === 'watched' && hasWatchedTrades ? data.watchedTrades : data.recentTrades;

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  const sumCount = (pick: (n: SidebarTradeNotification) => number | null) =>
    trades.reduce((acc, n) => acc + (pick(n) ?? 0), 0);

  const rowTotalValue = (values: Record<string, number> | null, other?: number | null) =>
    Object.values(values ?? {}).reduce((a, b) => a + b, other ?? 0);

  const rankTickers = (side: 'Buy' | 'Sell') => {
    const stats = new Map<string, { people: Set<string>; value: number }>();
    for (const n of trades) {
      const values = n[`trade${side}Values`] ?? {};
      for (const ticker of new Set([...(n[`trade${side}Tickers`] ?? []), ...Object.keys(values)])) {
        const cur = stats.get(ticker) ?? { people: new Set<string>(), value: 0 };
        cur.people.add(n.personName ?? String(n.id));
        cur.value += values[ticker] ?? 0;
        stats.set(ticker, cur);
      }
    }
    return [...stats].sort((a, b) => b[1].people.size - a[1].people.size || b[1].value - a[1].value);
  };

  const conflictsByTicker = new Map<string, Set<string>>();
  for (const n of trades) {
    for (const c of n.tradeConflicts ?? []) {
      const set = conflictsByTicker.get(c.ticker) ?? new Set<string>();
      set.add(c.committee.split(': ')[0].replace(/^(House|Senate|Joint) (Select )?Committee on (the )?/, ''));
      conflictsByTicker.set(c.ticker, set);
    }
  }

  const buyCount = sumCount((n) => n.tradeBuys);
  const sellCount = sumCount((n) => n.tradeSells);
  const buyTotalUSD = trades.reduce((acc, n) => acc + rowTotalValue(n.tradeBuyValues, n.tradeBuyOtherValue), 0);
  const sellTotalUSD = trades.reduce((acc, n) => acc + rowTotalValue(n.tradeSellValues, n.tradeSellOtherValue), 0);
  const topBuys = rankTickers('Buy').slice(0, 4);
  const topSells = rankTickers('Sell').slice(0, 4);

  const visiblePeople = showAllPeople ? data.watchedPeople : data.watchedPeople.slice(0, INITIAL_PEOPLE);
  const visibleUsers = showAllUsers
    ? data.followingUsers.following
    : data.followingUsers.following.slice(0, INITIAL_PEOPLE);
  const visibleTrades = showAllTrades ? trades : trades.slice(0, INITIAL_TRADES);

  const renderTickerChips = (tickers: string[] | null, cls: string) =>
    [...(tickers ?? [])]
      .sort((a, b) => Number(conflictsByTicker.has(b)) - Number(conflictsByTicker.has(a)) || a.localeCompare(b))
      .map((tk) => (
        <Link
          key={tk}
          href={tickerHref(tk)}
          title={
            conflictsByTicker.has(tk)
              ? `${t('notifications.conflict')}: ${[...conflictsByTicker.get(tk)!].slice(0, 3).join(', ')}`
              : undefined
          }
          className={`relative z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold hover:underline ${cls}`}
        >
          {conflictsByTicker.has(tk) ? <Icon name="warning" className="size-3 shrink-0 text-warning-soft" /> : null}
          {tk}
        </Link>
      ));

  const renderAssetChips = (assets: string[] | null, side: 'buy' | 'sell') =>
    assets?.map((a) => (
      <span
        key={a}
        title={`${side === 'buy' ? t('notifications.tradeBuys') : t('notifications.tradeSells')}: ${a}`}
        className={`min-w-0 max-w-full break-words rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
          side === 'buy' ? 'bg-success/10 text-success-soft ring-success/30' : 'bg-danger/10 text-danger-soft ring-danger/30'
        }`}
      >
        {a}
      </span>
    ));

  return (
    <aside aria-label={t('profile.following')} className="space-y-5 lg:sticky lg:top-20">
      {/* Section 1: Followed / Watched People & Users */}
      <section className="floating overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-raised/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="eye" className="size-4 shrink-0 text-accent" />
            <h2 className="truncate text-sm font-semibold text-ink">{t('profile.tradeWatches')}</h2>
            <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">
              {activeWatchedCount}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activeWatchedCount > 0 && onToggleFilterWatched ? (
              <button
                type="button"
                aria-pressed={!!filteringWatched}
                onClick={onToggleFilterWatched}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                  filteringWatched
                    ? 'bg-accent text-white ring-accent'
                    : 'bg-field text-muted ring-line hover:bg-raised hover:text-ink'
                }`}
              >
                {t('person.facet.label')}
              </button>
            ) : null}
            <Link href="/profile/notifications" className="text-xs font-medium text-link hover:underline">
              {t('common.edit')}
            </Link>
          </div>
        </header>

        {data.watchingAll ? (
          <div className="flex items-center justify-between gap-2 border-b border-line bg-accent/10 px-4 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <Icon name="check" className="size-3.5 text-accent" />
              {t('person.trades.watchingAll')}
            </span>
            <Link href="/notifications/trades" className="font-medium text-link hover:underline">
              {t('notifications.tradesHistory')}
            </Link>
          </div>
        ) : null}

        {data.watchedPeople.length > 0 ? (
          <>
            <ul className="divide-y divide-line">
              {visiblePeople.map((person) => (
                <WatchedPersonRow
                  key={person.id}
                  person={person}
                  watching={!unwatchedIds.has(person.id)}
                  onToggle={onTogglePersonWatch}
                />
              ))}
            </ul>
            {data.watchedPeople.length > INITIAL_PEOPLE ? (
              <button
                type="button"
                aria-expanded={showAllPeople}
                onClick={() => setShowAllPeople((v) => !v)}
                className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-accent hover:bg-raised/50"
              >
                {showAllPeople ? t('common.showLess') : `${t('common.showMore')} (${data.watchedPeople.length - INITIAL_PEOPLE})`}
              </button>
            ) : null}
          </>
        ) : (
          <p className="px-4 py-5 text-center text-xs text-subtle">{t('profile.tradeWatchesNone')}</p>
        )}

        {data.followingUsers.following.length > 0 ? (
          <div className="border-t border-line">
            <div className="flex items-center justify-between gap-2 bg-raised/30 px-4 py-2">
              <span className="text-xs font-semibold tracking-wide text-subtle uppercase">
                {t('profile.followingUsers')}
              </span>
              <span className="text-xs font-medium tabular-nums text-subtle">{data.followingUsers.total}</span>
            </div>
            <ul className="divide-y divide-line">
              {visibleUsers.map((u) => (
                <FollowedUserRow key={u.id} user={u} />
              ))}
            </ul>
            {data.followingUsers.following.length > INITIAL_PEOPLE ? (
              <button
                type="button"
                aria-expanded={showAllUsers}
                onClick={() => setShowAllUsers((v) => !v)}
                className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-accent hover:bg-raised/50"
              >
                {showAllUsers
                  ? t('common.showLess')
                  : `${t('common.showMore')} (${data.followingUsers.following.length - INITIAL_PEOPLE})`}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* Section 2: Recent Stock Trades (Notification Bell / Trades History style) */}
      <section className="floating overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-raised/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="trending-up" className="size-4 shrink-0 text-accent" />
            <h2 className="truncate text-sm font-semibold text-ink">{t('notifications.tradesToday')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasWatchedTrades ? (
              <div role="group" aria-label={t('notifications.tradesToday')} className="flex rounded-full bg-field p-0.5 ring-1 ring-line ring-inset">
                <button
                  type="button"
                  aria-pressed={effectiveScope === 'watched'}
                  onClick={() => setTradeScope('watched')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    effectiveScope === 'watched' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t('person.trades.watching')}
                </button>
                <button
                  type="button"
                  aria-pressed={effectiveScope === 'all'}
                  onClick={() => setTradeScope('all')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    effectiveScope === 'all' ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {t('person.all')}
                </button>
              </div>
            ) : null}
            <Link
              href={hasWatchedTrades || data.watchingAll ? '/notifications/trades' : '/trades'}
              className="text-xs font-medium text-link hover:underline"
            >
              {t('notifications.tradesHistory')}
            </Link>
          </div>
        </header>

        {trades.length > 0 ? (
          <>
            {/* Notification-style Buy / Sell summary tiles with top tickers & conflict warnings */}
            <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-3 text-xs">
              {(
                [
                  ['tradeBuys', buyCount, buyTotalUSD, topBuys, 'text-success-soft ring-success/40'],
                  ['tradeSells', sellCount, sellTotalUSD, topSells, 'text-danger-soft ring-danger/40'],
                ] as const
              ).map(([key, count, totalUsd, rankedList, tone]) => (
                <div
                  key={key}
                  className={`flex min-w-0 flex-col rounded-lg bg-field px-2.5 py-2 ring-1 ring-inset ${
                    count ? tone : 'text-subtle ring-line'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1 font-medium">
                    <span>{t(`notifications.${key}`)}</span>
                    <span className="text-base font-semibold tabular-nums">{count}</span>
                  </div>
                  {totalUsd > 0 ? (
                    <div className="text-[11px] font-medium tabular-nums text-muted">{money.format(totalUsd)}</div>
                  ) : null}
                  {rankedList.length > 0 ? (
                    <div className="mt-1 space-y-0.5 border-t border-line/60 pt-1 text-[11px] text-muted">
                      {rankedList.map(([ticker, st]) => (
                        <div key={ticker} className="flex min-w-0 items-baseline gap-1.5">
                          <span className="w-3.5 shrink-0 text-end tabular-nums text-subtle">{st.people.size}</span>
                          <Link href={tickerHref(ticker)} className="truncate font-semibold text-ink hover:underline">
                            {ticker}
                          </Link>
                          {conflictsByTicker.has(ticker) ? (
                            <span
                              title={`${t('notifications.conflict')}: ${[...conflictsByTicker.get(ticker)!].slice(0, 3).join(', ')}`}
                              className="ms-auto shrink-0 text-warning-soft"
                            >
                              <Icon name="warning" className="size-3" />
                            </span>
                          ) : st.value ? (
                            <span className="ms-auto shrink-0 text-[10px] tabular-nums text-subtle">
                              {money.format(st.value)}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Individual trade notification rows */}
            <ul className="divide-y divide-line">
              {visibleTrades.map((n) => {
                const buyVal = rowTotalValue(n.tradeBuyValues, n.tradeBuyOtherValue);
                const sellVal = rowTotalValue(n.tradeSellValues, n.tradeSellOtherValue);
                const href = n.personName ? `${personPath(n.personName)}#trades` : '/trades';
                return (
                  <li key={`${n.id}-${n.tradeFiling ?? n.tradeFiledDate}`} className="relative px-4 py-3 text-sm hover:bg-raised/40">
                    <div className="flex items-start gap-3">
                      <Link href={href} className="shrink-0">
                        <SmallPersonAvatar name={n.personName ?? '?'} photoUrl={n.personPhotoUrl} size="size-9" />
                      </Link>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={href} className="min-w-0 text-xs leading-snug text-ink hover:no-underline">
                            {t.rich('notifications.trade', {
                              count: n.tradeCount ?? 0,
                              tickers: n.tradeTickers?.length ? `: ${n.tradeTickers.slice(0, 4).join(', ')}` : '',
                              person: () => <span className="font-semibold">{n.personName}</span>,
                            })}
                          </Link>
                          {buyVal || sellVal ? (
                            <span className="flex shrink-0 gap-1 text-[11px] font-semibold tabular-nums">
                              {buyVal ? (
                                <span className="rounded-full px-1.5 py-0.5 text-success-soft ring-1 ring-success/40 ring-inset">
                                  {money.format(buyVal)}
                                </span>
                              ) : null}
                              {sellVal ? (
                                <span className="rounded-full px-1.5 py-0.5 text-danger-soft ring-1 ring-danger/40 ring-inset">
                                  {money.format(sellVal)}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </div>

                        {n.tradeBuyTickers?.length ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {renderTickerChips(n.tradeBuyTickers, 'bg-success/15 text-success-soft')}
                          </div>
                        ) : null}
                        {n.tradeBuyAssets?.length ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {renderAssetChips(n.tradeBuyAssets, 'buy')}
                          </div>
                        ) : null}
                        {n.tradeSellTickers?.length ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {renderTickerChips(n.tradeSellTickers, 'bg-danger/15 text-danger-soft')}
                          </div>
                        ) : null}
                        {n.tradeSellAssets?.length ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {renderAssetChips(n.tradeSellAssets, 'sell')}
                          </div>
                        ) : null}

                        <ConflictBadge n={n} />

                        {n.tradeFiledDate ? (
                          <div className="text-[11px] text-subtle">
                            {t('person.trades.filed')} {n.tradeFiledDate.slice(0, 10)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {trades.length > INITIAL_TRADES ? (
              <button
                type="button"
                aria-expanded={showAllTrades}
                onClick={() => setShowAllTrades((v) => !v)}
                className="w-full border-t border-line px-4 py-2 text-xs font-semibold text-accent hover:bg-raised/50"
              >
                {showAllTrades ? t('common.showLess') : `${t('common.showMore')} (${trades.length - INITIAL_TRADES})`}
              </button>
            ) : null}
          </>
        ) : (
          <p className="px-4 py-6 text-center text-xs text-subtle">{t('person.trades.none')}</p>
        )}
      </section>

      {/* Section 3: Investor Portfolio Moves (Premium) */}
      {data.traderMoves.locked ? (
        <section className="floating overflow-hidden">
          <Link
            href="/premium"
            className="flex items-center gap-3 px-4 py-3 text-sm text-muted hover:bg-raised hover:text-ink hover:no-underline"
          >
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Icon name="trending-up" className="size-4" />
            </span>
            <span className="font-medium">{t('notifications.premiumTeaser')}</span>
          </Link>
        </section>
      ) : data.traderMoves.positions.length > 0 ? (
        <section className="floating overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b border-line bg-raised/40 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-subtle uppercase">
              <span>{t('notifications.premiumHeading')}</span>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">
                {t('notifications.premiumWindow')}
              </span>
            </div>
            <Link href="/premium" className="text-xs font-medium text-link hover:underline">
              {t('notifications.tradesHistory')}
            </Link>
          </header>
          <ul className="divide-y divide-line">
            {data.traderMoves.positions.map((p) => {
              const pnl = p.estimatedPnlPercent;
              return (
                <li key={p.id}>
                  <Link
                    href={`/person/${p.traderSlug}#premium-trades`}
                    className="block px-4 py-2.5 text-sm hover:bg-raised/50 hover:no-underline"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                        {t(PREMIUM_MOVE[p.action] ?? 'notifications.premiumBuy', {
                          name: p.traderName,
                          ticker: p.ticker,
                        })}
                      </span>
                      {pnl != null ? (
                        <span className={`shrink-0 text-xs font-semibold tabular-nums ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pnl > 0 ? '+' : ''}
                          {pnl}%
                        </span>
                      ) : null}
                    </div>
                    {p.summary ? <div className="mt-0.5 line-clamp-2 text-xs text-subtle">{p.summary}</div> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Section 4: Recent Timeline Pins Linked to Watched / Notable People */}
      {data.recentPins.length > 0 ? (
        <section className="floating overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b border-line bg-raised/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="pin" className="size-4 shrink-0 text-accent" />
              <h2 className="truncate text-sm font-semibold text-ink">{t('notifications.groupWatching')}</h2>
            </div>
          </header>
          <ul className="divide-y divide-line">
            {data.recentPins.map((pin) => (
              <li key={pin.id} className="px-4 py-2.5 text-sm hover:bg-raised/40">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-subtle">
                  <Link
                    href={`/person/${pin.personSlug}`}
                    className="inline-flex min-w-0 items-center gap-1.5 font-medium text-muted hover:text-ink hover:no-underline"
                  >
                    <SmallPersonAvatar name={pin.personName} photoUrl={pin.personPhotoUrl} size="size-4" />
                    <span className="truncate">{pin.personName}</span>
                    {pin.watched ? <Icon name="eye" className="size-3 shrink-0 text-accent" /> : null}
                  </Link>
                  <time className="shrink-0 text-[11px]" dateTime={pin.utcCreatedDateTime}>
                    {timeAgo(pin.utcCreatedDateTime, undefined, t.locale)}
                  </time>
                </div>
                <Link
                  href={pinPath({ id: pin.id, title: pin.title })}
                  className="line-clamp-2 block text-xs leading-snug font-medium text-ink hover:text-link hover:no-underline"
                >
                  {pin.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
