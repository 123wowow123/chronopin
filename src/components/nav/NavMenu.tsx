'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useSession } from '@/lib/client/session';
import { NotificationBell } from './NotificationBell';

const itemClass = 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-raised hover:no-underline';
const itemIconClass = 'size-4 text-subtle';

type MenuItem = { href: string; label: string; icon: IconName };

// The account menu, in groups separated by a rule. Admin tools only for admins.
function accountGroups(isAdmin: boolean): MenuItem[][] {
  const groups: MenuItem[][] = [
    [
      { href: '/profile', label: 'Profile', icon: 'user' },
      { href: '/search?f=watch', label: 'Watched pins', icon: 'eye' },
      { href: '/following', label: 'Following', icon: 'users' },
    ],
    [
      { href: '/preferences', label: 'Preferences', icon: 'sliders' },
      { href: '/settings', label: 'Change password', icon: 'lock' },
    ],
  ];
  if (isAdmin) {
    groups.push([{ href: '/admin', label: 'Admin', icon: 'shield' }]);
  }
  return groups;
}

// Timeline or Map, with the current one highlighted, so it reads as a choice
// of view rather than two unrelated links. Switching keeps the search and its
// time filters: a search's results show on the map, and the map's search opens
// as results.
function ViewSwitch({ pathname, className = '' }: { pathname: string; className?: string }) {
  const params = useSearchParams();
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
  const toMap = carry(['q', 'f', 'posted', 'past', 'future']);
  const searching = !!(params.get('q') || params.get('f'));
  const toTimeline = carry(searching ? ['q', 'f', 'sort', 'posted', 'past', 'future'] : ['posted']);
  const query = (search: URLSearchParams) => (search.size ? `?${search.toString()}` : '');
  const views = [
    { href: `${searching ? '/search' : '/'}${query(toTimeline)}`, label: 'Timeline', icon: 'timeline', current: pathname === '/' || pathname === '/search' },
    { href: `/map${query(toMap)}`, label: 'Map', icon: 'map', current: pathname.startsWith('/map') },
  ] as const;
  return (
    <div className={`flex rounded-full bg-field p-0.5 ring-1 ring-line ring-inset ${className}`}>
      {views.map((view) => (
        <Link
          key={view.label}
          href={view.href}
          aria-current={view.current ? 'page' : undefined}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors hover:no-underline ${
            view.current ? 'bg-raised-2 text-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          <Icon name={view.icon} className="size-4" />
          {view.label}
        </Link>
      ))}
    </div>
  );
}

function MenuLinks({ groups, logoutHref }: { groups: MenuItem[][]; logoutHref: string }) {
  return (
    <>
      {groups.map((group, index) => (
        <div key={index} className="border-b border-line py-1.5">
          {group.map((item) => (
            <Link key={item.href} href={item.href} className={itemClass}>
              <Icon name={item.icon} className={itemIconClass} />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
      <div className="py-1.5">
        <a href={logoutHref} className={itemClass}>
          <Icon name="logout" className={itemIconClass} />
          Log out
        </a>
      </div>
    </>
  );
}

function SignedInAs({ userName, pictureUrl }: { userName: string; pictureUrl?: string | null }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
      <UserAvatar userName={userName} pictureUrl={pictureUrl} className="size-8 text-sm" />
      <div className="min-w-0">
        <div className="text-xs text-subtle">Signed in as</div>
        <div className="truncate text-sm font-semibold text-ink">{userName}</div>
      </div>
    </div>
  );
}

// The right side of the navbar: what a visitor can do depends on whether they
// are signed in, so it renders on the client from the session.
export function NavMenu() {
  const pathname = usePathname();
  const { status, user, isAdmin } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
    setAccountOpen(false);
  }

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
      if (!mobileRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  const redirect = encodeURIComponent(pathname);
  const logoutHref = `/logout?referrer=${redirect}`;
  const groups = accountGroups(isAdmin);

  const guestActions =
    !user && status === 'ready' ? (
      <>
        <Link href={`/login?redirect=${redirect}`} className="btn btn-ghost py-1.5">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary py-1.5">
          Sign up
        </Link>
      </>
    ) : null;

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-2 lg:flex">
        <ViewSwitch pathname={pathname} />
        {user ? (
          <Link href="/create" className="btn btn-primary py-1.5">
            <Icon name="plus" className="size-4" />
            Create
          </Link>
        ) : (
          guestActions
        )}
      </nav>

      {user ? <NotificationBell /> : null}

      {user ? (
        <div ref={accountRef} className="relative hidden lg:block">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-sm font-medium text-muted ring-1 ring-line transition-colors ring-inset hover:bg-raised hover:text-ink"
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
            <div className="floating absolute right-0 z-50 mt-2 w-60 overflow-hidden">
              <SignedInAs userName={user.userName} pictureUrl={user.pictureUrl} />
              <div className="px-1.5">
                <MenuLinks groups={groups} logoutHref={logoutHref} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div ref={mobileRef} className="lg:hidden">
        <button
          type="button"
          className="flex items-center rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {user && !menuOpen ? (
            <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-7 text-xs" />
          ) : (
            <Icon name={menuOpen ? 'close' : 'menu'} className="size-6" />
          )}
        </button>
        {menuOpen ? (
          <nav aria-label="Main" className="absolute top-full right-0 left-0 z-40 border-b border-line bg-header px-3 pt-3 pb-1.5 shadow-2xl shadow-shade/50">
            <ViewSwitch pathname={pathname} className="mb-3" />
            {user ? (
              <>
                <Link href="/create" className="btn btn-primary mb-3 flex py-2">
                  <Icon name="plus" className="size-4" />
                  Create a pin
                </Link>
                <div className="-mx-3 border-t border-line">
                  <SignedInAs userName={user.userName} pictureUrl={user.pictureUrl} />
                </div>
                <MenuLinks groups={groups} logoutHref={logoutHref} />
              </>
            ) : (
              <div className="mb-1.5 grid grid-cols-2 gap-2 [&>a]:justify-center">{guestActions}</div>
            )}
          </nav>
        ) : null}
      </div>
    </>
  );
}
