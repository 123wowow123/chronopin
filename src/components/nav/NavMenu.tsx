'use client';

import Link from '@/components/ui/Link';
import { usePathname, useRouter, useSearchParams } from '@/lib/client/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { hrefKeepingDate, hrefNearDay } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';
import { AuthLink, LogoutLink } from './AuthLink';
import { NotificationBell, WeatherButton } from './NotificationBell';
import { searchHref, WATCHED } from './SearchBox';
import { WatchAlerts } from './WatchAlerts';
import { MessengerButton } from '@/components/messages/Messenger';
import { useT } from '@/lib/client/i18n';
import type { MessageKey } from '@/lib/i18n/translate';

const itemClass = 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-raised hover:no-underline active:bg-raised-2';
const itemIconClass = 'size-4 text-subtle';

type MenuItem = { href: string; label: MessageKey; icon: IconName };

// The account menu, in groups separated by a rule. Admin tools only for admins.
// Profile and settings are not a row here: the block at the head of the menu
// (SignedInAs) is that link, since it already names the account they belong to.
function accountGroups(isAdmin: boolean): MenuItem[][] {
  const own: MenuItem[] = [{ href: '/listings', label: 'nav.listings', icon: 'tag' }];
  return isAdmin ? [own, [{ href: '/admin/views', label: 'nav.admin', icon: 'shield' }]] : [own];
}

// Timeline or Map, with the current one highlighted, so it reads as a choice
// of view rather than two unrelated links. Switching keeps the search and its
// time filters: a search's results show on the map, and the map's search opens
// as results.
export function ViewSwitch({ pathname, className = '' }: { pathname: string; className?: string }) {
  const params = useSearchParams();
  const t = useT();
  const carry = (keys: string[]) => {
    const search = new URLSearchParams();
    if (pathname === '/' || pathname === '/search' || pathname.startsWith('/map')) {
      for (const key of keys) {
        const value = params.get(key);
        if (value) search.set(key, value);
      }
    }
    return search;
  };
  const toMap = carry(['q', 'f', 'posted', 'past', 'future', 'fit']);
  const searching = !!(params.get('q') || params.get('f'));
  const toTimeline = carry(searching ? ['q', 'f', 'sort', 'posted', 'past', 'future', 'fit'] : ['posted']);
  const query = (search: URLSearchParams) => (search.size ? `?${search.toString()}` : '');
  const views = [
    { href: `${searching ? '/search' : '/'}${query(toTimeline)}`, key: 'timeline', label: t('nav.timeline'), icon: 'timeline', current: pathname === '/' || pathname === '/search' },
    { href: `/map${query(toMap)}`, key: 'map', label: t('nav.map'), icon: 'map', current: pathname.startsWith('/map') },
  ] as const;
  return (
    <div className={`flex rounded-full bg-field p-0.5 ring-1 ring-line ring-inset ${className}`}>
      {views.map((view) => (
        <Link
          key={view.key}
          href={view.href}
          aria-current={view.current ? 'page' : undefined}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors hover:no-underline ${
            view.current ? 'bg-raised-2 text-ink shadow-sm' : 'text-muted hover:bg-raised hover:text-ink active:bg-raised-2'
          }`}
        >
          <Icon name={view.icon} className="size-4" />
          {view.label}
        </Link>
      ))}
    </div>
  );
}

// The watched-only filter, for the account menu and the drawer: it keeps the
// search (and the map, when on it) and only turns the filter on or off.
export function useWatchedToggle() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const onMap = pathname === '/map';
  const searching = onMap || pathname === '/search';
  const watchedOnly = searching && params.get('f') === WATCHED;
  const toggle = () => {
    const href = searchHref(onMap, searching ? params.get('q') || '' : '', watchedOnly ? '' : WATCHED);
    // Turning Watched off widens the search, which stays on the same date;
    // turning it on opens on the day nearest it.
    router.push(watchedOnly ? hrefKeepingDate(href) : hrefNearDay(href));
  };
  return { watchedOnly, toggle };
}

// An on/off switch drawn at the end of a menu row.
export function SwitchMark({ on, size = 'md' }: { on: boolean; size?: 'sm' | 'md' }) {
  const [track, knob, shift] = size === 'sm' ? ['h-5 w-8', 'size-4', 'translate-x-3 rtl:-translate-x-3'] : ['h-6 w-10', 'size-5', 'translate-x-4 rtl:-translate-x-4'];
  return (
    <span aria-hidden className={`ms-auto flex ${track} shrink-0 items-center rounded-full p-0.5 transition-colors ${on ? 'bg-accent' : 'bg-raised-2'}`}>
      <span className={`${knob} rounded-full bg-white shadow transition-transform ${on ? shift : ''}`} />
    </span>
  );
}

function WatchedRow({ onToggle }: { onToggle: () => void }) {
  const t = useT();
  const { watchedOnly, toggle } = useWatchedToggle();
  return (
    <div className="border-b border-line py-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={watchedOnly}
        onClick={() => {
          onToggle();
          toggle();
        }}
        className={`w-full ${itemClass}`}
      >
        <Icon name="eye" className={`${itemIconClass} ${watchedOnly ? 'text-link' : ''}`} />
        {t('nav.watchedOnly')}
        <SwitchMark on={watchedOnly} size="sm" />
      </button>
    </div>
  );
}

function MenuLinks({ groups }: { groups: MenuItem[][] }) {
  const t = useT();
  return (
    <>
      {groups.map((group, index) => (
        <div key={index} className="border-b border-line py-1.5">
          {group.map((item) => (
            <Link key={item.href} href={item.href} className={itemClass}>
              <Icon name={item.icon} className={itemIconClass} />
              {t(item.label)}
            </Link>
          ))}
        </div>
      ))}
      <div className="py-1.5">
        <LogoutLink className={itemClass}>
          <Icon name="logout" className={itemIconClass} />
          {t('nav.logOut')}
        </LogoutLink>
      </div>
    </>
  );
}

// Who is signed in, at the head of the account menu - and the way to their
// profile and settings, which is what the account named here opens on. The
// handle leads, with where it goes under it, rather than a separate row
// saying the same name again.
function SignedInAs({ userName, pictureUrl }: { userName: string; pictureUrl?: string | null }) {
  const t = useT();
  return (
    <Link href="/profile" className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 hover:bg-raised hover:no-underline">
      <UserAvatar userName={userName} pictureUrl={pictureUrl} className="size-8 text-sm" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{userName}</span>
        <span className="block truncate text-xs text-subtle">{t('nav.profileSettings')}</span>
      </span>
      <Icon name="chevron" className="ms-auto size-3.5 shrink-0 -rotate-90 text-subtle rtl:rotate-90" />
    </Link>
  );
}

// The right side of the navbar: what a visitor can do depends on whether they
// are signed in, so it renders on the client from the session. Below lg it is
// all in the drawer instead (MobileDrawer), the bell included.
export function NavMenu() {
  const pathname = usePathname();
  const { status, user, isAdmin } = useSession();
  const t = useT();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setAccountOpen(false);
  }

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const groups = accountGroups(isAdmin);

  // One button, not two: the login page already offers signing up to whoever
  // has no account yet.
  const guestActions =
    !user && status === 'ready' ? (
      <AuthLink to="/login" className="btn btn-primary py-1.5">
        {t('nav.logIn')}
      </AuthLink>
    ) : null;

  return (
    <>
      <nav aria-label={t('nav.main')} className="hidden items-center gap-2 lg:flex">
        <ViewSwitch pathname={pathname} />
        {user ? (
          <Link
            href="/create"
            className="btn btn-primary group gap-1.5 rounded-full py-1.5 pe-3.5 ps-2.5 font-medium shadow-sm ring-1 shadow-accent/30 ring-white/10 ring-inset"
          >
            <Icon name="plus" className="size-4 transition-transform duration-200 group-hover:rotate-90" />
            {t('nav.create')}
          </Link>
        ) : (
          <>
            {/* Left of the Log in button, where the bell sits left of the
                account menu when there is someone signed in. */}
            <WeatherButton />
            {guestActions}
          </>
        )}
      </nav>

      {user ? <MessengerButton className="hidden lg:block" /> : null}
      {user ? <NotificationBell className="hidden lg:block" /> : null}
      {user ? <WatchAlerts /> : null}

      {user ? (
        <div ref={accountRef} className="relative hidden lg:block">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full py-1 pe-2.5 ps-1 text-sm font-medium text-muted ring-1 ring-line transition-colors ring-inset hover:bg-raised hover:text-ink"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((o) => !o)}
          >
            <span aria-hidden className="contents">
              <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-7 text-xs" />
            </span>
            <span className="max-w-40 truncate">{user.userName}</span>
            <Icon name="chevron" className={`size-3.5 text-subtle transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
          </button>
          {accountOpen ? (
            <div className="floating absolute end-0 z-50 mt-2 w-60 overflow-hidden">
              <SignedInAs userName={user.userName} pictureUrl={user.pictureUrl} />
              <div className="px-1.5">
                <WatchedRow onToggle={() => setAccountOpen(false)} />
                <MenuLinks groups={groups} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
