'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useSession } from '@/lib/client/session';
import { NotificationBell } from './NotificationBell';

const linkClass = 'block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-ink hover:no-underline lg:py-1.5';
const itemClass = 'block rounded-md px-3 py-2 text-sm text-ink hover:bg-raised hover:no-underline';

// The right side of the navbar: what a visitor can do depends on whether they
// are signed in, so it renders on the client from the session.
export function NavMenu() {
  const pathname = usePathname();
  const { status, user, isAdmin } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
    setAccountOpen(false);
  }

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const onMap = pathname.startsWith('/map');
  const redirect = encodeURIComponent(pathname);

  const links = (
    <>
      {isAdmin ? (
        <Link href="/admin" className={linkClass}>
          Admin
        </Link>
      ) : null}
      {onMap ? (
        <Link href="/" className={linkClass}>
          Timeline
        </Link>
      ) : (
        <Link href="/map" className={linkClass}>
          Map
        </Link>
      )}
      {user ? (
        <Link href="/create" className="btn btn-primary mx-3 my-1 py-1.5 max-lg:flex lg:mx-1 lg:my-0">
          <Icon name="plus" className="size-4" />
          Create
        </Link>
      ) : status === 'ready' ? (
        <>
          <Link href={`/login?redirect=${redirect}`} className={linkClass}>
            Login
          </Link>
          <Link href="/signup" className="btn btn-primary mx-3 my-1 py-1.5 max-lg:flex lg:mx-1 lg:my-0">
            Sign up
          </Link>
        </>
      ) : null}
      {user ? (
        <div ref={accountRef} className="relative">
          <button type="button" className={`${linkClass} flex w-full items-center gap-2`} aria-expanded={accountOpen} onClick={() => setAccountOpen((o) => !o)}>
            <span aria-hidden className="contents">
              <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-6 text-[11px]" />
            </span>
            {user.userName}
            <Icon name="chevron" className={`size-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
          </button>
          {accountOpen ? (
            <div className="z-50 mx-3 p-1.5 lg:absolute lg:right-0 lg:mx-0 lg:mt-2 lg:min-w-48 lg:rounded-xl lg:border lg:border-white/[0.07] lg:bg-panel lg:shadow-2xl lg:shadow-black/50" role="menu">
              {isAdmin ? (
                <Link href="/referral" className={itemClass} role="menuitem">
                  Referral
                </Link>
              ) : null}
              {/* The navbar's Watched/All choice is hidden on phones; this reaches it anywhere. */}
              <Link href="/search?f=watch" className={itemClass} role="menuitem">
                Watched
              </Link>
              <Link href="/following" className={itemClass} role="menuitem">
                Following
              </Link>
              <Link href="/preferences" className={itemClass} role="menuitem">
                Preferences
              </Link>
              <Link href="/settings" className={itemClass} role="menuitem">
                Password
              </Link>
              <div className="my-1.5 border-t border-line" />
              <Link href="/profile" className={itemClass} role="menuitem">
                Profile
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      {user ? (
        <a href={`/logout?referrer=${redirect}`} className={linkClass}>
          Logout
        </a>
      ) : null}
    </>
  );

  return (
    <>
      {user ? <NotificationBell /> : null}
      <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
        {links}
      </nav>
      <button
        type="button"
        className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink lg:hidden"
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <Icon name={user ? 'user' : 'menu'} className="size-6" />
      </button>
      {menuOpen ? (
        <nav aria-label="Main" className="absolute top-full right-0 left-0 z-40 border-b border-line bg-header px-1 py-2 shadow-2xl shadow-black/50 lg:hidden">
          {links}
        </nav>
      ) : null}
    </>
  );
}
