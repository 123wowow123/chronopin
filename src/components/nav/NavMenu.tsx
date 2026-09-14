'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useSession } from '@/lib/client/session';
import { NotificationBell } from './NotificationBell';

const linkClass = 'block px-3 py-2 text-[15px] text-ink hover:bg-raised hover:no-underline';

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
        <Link href="/create" className={linkClass}>
          Create
        </Link>
      ) : status === 'ready' ? (
        <>
          <Link href="/signup" className={linkClass}>
            Sign up
          </Link>
          <Link href={`/login?redirect=${redirect}`} className={linkClass}>
            Login
          </Link>
        </>
      ) : null}
      {user ? (
        <div ref={accountRef} className="relative">
          <button type="button" className={`${linkClass} flex items-center gap-1`} aria-expanded={accountOpen} onClick={() => setAccountOpen((o) => !o)}>
            {user.userName}
            <span aria-hidden>▾</span>
          </button>
          {accountOpen ? (
            <div className="right-0 z-50 min-w-44 rounded border border-raised bg-header py-1 shadow-xl md:absolute" role="menu">
              {isAdmin ? (
                <Link href="/referral" className={linkClass} role="menuitem">
                  Referral
                </Link>
              ) : null}
              <Link href="/following" className={linkClass} role="menuitem">
                Following
              </Link>
              <Link href="/preferences" className={linkClass} role="menuitem">
                Preferences
              </Link>
              <Link href="/settings" className={linkClass} role="menuitem">
                Password
              </Link>
              <div className="my-1 border-t border-raised" />
              <Link href="/profile" className={linkClass} role="menuitem">
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
      <nav aria-label="Main" className="hidden items-center md:flex">
        {links}
      </nav>
      <button
        type="button"
        className="p-2 text-muted hover:text-ink md:hidden"
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <Icon name={user ? 'user' : 'menu'} className="size-6" />
      </button>
      {menuOpen ? (
        <nav aria-label="Main" className="absolute top-full right-0 left-0 z-40 border-t border-raised bg-header py-2 md:hidden">
          {links}
        </nav>
      ) : null}
    </>
  );
}
