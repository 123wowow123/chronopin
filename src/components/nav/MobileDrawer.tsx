'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LogoMark } from '@/components/ui/LogoMark';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useUnreadCount } from '@/lib/client/notifications';
import { useScrollLock } from '@/lib/client/scrollLock';
import { useSession } from '@/lib/client/session';
import { AuthLink, LogoutLink } from './AuthLink';
import { ViewSwitch } from './NavMenu';
import { DrawerNotifications } from './NotificationBell';
import { searchHref, WATCHED } from './SearchBox';

const itemClass =
  'flex items-center gap-4 rounded-full px-3 py-2 text-[17px] font-semibold text-ink hover:bg-raised hover:no-underline aria-[current=page]:text-accent';

// A swipe under way: where it started, and once it has moved far enough to
// tell, whether it runs across (drags the drawer) or down (scrolls it).
type Swipe = { x: number; y: number; time: number; width: number; axis: 'x' | 'y' | null };

const noSubscribe = () => () => {};

// A titled group of drawer rows, set off from the one above by a rule.
function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="border-t border-line px-2 pt-2 pb-2.5">
      <div id={id} className="px-3 pt-1 pb-1 text-xs font-semibold tracking-wider text-subtle uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}

// Below lg, the menu is a drawer that slides in from the left, like Twitter's:
// the button sits at the left of the navbar (the avatar once signed in), the
// page dims behind the drawer, and a tap on the dimmed page, Escape, a link or
// a swipe to the left puts it away.
export function MobileDrawer() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { user, isAdmin } = useSession();
  const unread = useUnreadCount(!!user);
  const [open, setOpen] = useState(false);
  // How far a swipe has pulled the drawer back, as a fraction of its width (-1..0).
  const [drag, setDrag] = useState(0);
  // The drawer lives in <body>: the navbar's backdrop blur would otherwise
  // trap a fixed element inside the bar. There is no <body> to portal into
  // while rendering on the server.
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<Swipe | null>(null);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const trigger = triggerRef.current;
    // A modal: the page behind is out of reach of Tab and screen readers.
    const behind = [...document.body.children].filter((el): el is HTMLElement => el instanceof HTMLElement && el !== root && !el.inert);
    for (const el of behind) el.inert = true;
    panelRef.current?.focus();

    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // Widened past lg (a rotated tablet), the drawer's button is gone.
    const wide = window.matchMedia('(width >= 64rem)');
    const widened = () => {
      if (wide.matches) setOpen(false);
    };
    document.addEventListener('keydown', escape);
    wide.addEventListener('change', widened);
    return () => {
      document.removeEventListener('keydown', escape);
      wide.removeEventListener('change', widened);
      for (const el of behind) el.inert = false;
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    swipe.current = { x: touch.clientX, y: touch.clientY, time: event.timeStamp, width: panelRef.current?.offsetWidth || 1, axis: null };
  }

  function onTouchMove(event: React.TouchEvent) {
    const current = swipe.current;
    if (!current) return;
    const touch = event.touches[0];
    const dx = touch.clientX - current.x;
    const dy = touch.clientY - current.y;
    if (!current.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (current.axis === 'x') setDrag(Math.max(-1, Math.min(0, dx / current.width)));
  }

  function onTouchEnd(event: React.TouchEvent) {
    const current = swipe.current;
    swipe.current = null;
    if (!current || current.axis !== 'x') return;
    // A third of the way, or a flick.
    const speed = (-drag * current.width) / Math.max(1, event.timeStamp - current.time);
    if (drag < -1 / 3 || speed > 0.5) setOpen(false);
    setDrag(0);
  }

  const dragging = drag !== 0;
  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';

  const link = (href: string, icon: IconName, label: string) => (
    <Link href={href} aria-current={pathname === href ? 'page' : undefined} className={itemClass}>
      <Icon name={icon} className="size-6" />
      {label}
    </Link>
  );

  // The search box's Watched toggle, moved in here: it keeps the search (and
  // the map, when on it) and only turns the watched-only filter on or off.
  const onMap = pathname === '/map';
  const searching = onMap || pathname === '/search';
  const watchedOnly = searching && params.get('f') === WATCHED;
  const toggleWatched = () => {
    setOpen(false);
    router.push(searchHref(onMap, searching ? params.get('q') || '' : '', watchedOnly ? '' : WATCHED));
  };

  const drawer = (
    <div
      ref={rootRef}
      className="lg:hidden"
      inert={!open}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        swipe.current = null;
        setDrag(0);
      }}
      // Any link inside puts the drawer away, even one to the page already showing.
      onClick={(event) => {
        if ((event.target as Element).closest('a')) setOpen(false);
      }}
    >
      <div
        aria-hidden
        className={`fixed inset-0 z-50 touch-none bg-shade/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={dragging ? { opacity: 1 + drag, transition: 'none' } : undefined}
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] touch-pan-y flex-col overflow-y-auto overscroll-contain bg-header pl-[env(safe-area-inset-left)] shadow-2xl shadow-shade/50 outline-none transition-[translate,visibility] duration-300 ease-out ${
          open ? 'translate-x-0' : 'invisible -translate-x-full'
        }`}
        style={dragging ? { translate: `${drag * 100}% 0`, transition: 'none' } : undefined}
      >
        <div className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          {user ? (
            <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 hover:no-underline">
              <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-11 text-base" />
              <span className="min-w-0">
                <span className="block truncate text-lg leading-tight font-bold text-ink">{user.userName}</span>
                {fullName ? <span className="block truncate text-sm text-subtle">{fullName}</span> : null}
              </span>
            </Link>
          ) : (
            // A plain link, not next/link: going home reloads the page, fresh from today.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/" className="flex flex-1 items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink hover:no-underline">
              <LogoMark className="size-8 drop-shadow-[0_2px_6px_rgb(244_63_94/0.35)]" />
              Chronopin
            </a>
          )}
          <button
            type="button"
            className="-mr-1.5 shrink-0 self-start rounded-full p-1.5 text-muted hover:bg-raised hover:text-ink"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* The one thing to do first: make a pin, or sign in to be able to. */}
        <div className="px-4 pb-4">
          {user ? (
            <Link href="/create" className="btn btn-primary flex py-2.5">
              <Icon name="plus" className="size-4" />
              Create a pin
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <AuthLink to="/signup" className="btn btn-primary flex py-2.5">
                Sign up
              </AuthLink>
              <AuthLink to="/login" className="btn btn-secondary flex py-2.5">
                Log in
              </AuthLink>
            </div>
          )}
        </div>

        <nav aria-label="Main" className="flex-1">
          {/* What the page shows. */}
          <DrawerSection title="Browse">
            <div className="px-1 pb-1">
              <ViewSwitch pathname={pathname} />
            </div>
            {user ? (
              <button type="button" role="switch" aria-checked={watchedOnly} onClick={toggleWatched} className={`w-full ${itemClass}`}>
                <Icon name="eye" className={`size-6 ${watchedOnly ? 'text-link' : ''}`} />
                Watched pins only
                <span aria-hidden className={`ml-auto flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${watchedOnly ? 'bg-accent' : 'bg-raised-2'}`}>
                  <span className={`size-5 rounded-full bg-white shadow transition-transform ${watchedOnly ? 'translate-x-4' : ''}`} />
                </span>
              </button>
            ) : null}
          </DrawerSection>
          {user ? (
            <>
              <DrawerSection title="You">
                <DrawerNotifications className={itemClass} current={pathname === '/notifications'} />
                {link('/profile', 'user', 'Profile & settings')}
              </DrawerSection>
              {isAdmin ? <DrawerSection title="Admin">{link('/admin/views', 'shield', 'Dashboard')}</DrawerSection> : null}
            </>
          ) : null}
        </nav>

        {user ? (
          <div className="border-t border-line px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <LogoutLink className={itemClass}>
              <Icon name="logout" className="size-6" />
              Log out
            </LogoutLink>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="relative -ml-1 flex shrink-0 items-center rounded-full p-1 text-muted hover:bg-raised hover:text-ink lg:hidden"
        aria-label={unread ? `Open menu, ${unread} unread notification${unread === 1 ? '' : 's'}` : 'Open menu'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {user ? (
          <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-7 text-xs" />
        ) : (
          <span className="flex size-7 items-center justify-center">
            <Icon name="menu" className="size-6" />
          </span>
        )}
        {/* Unread notifications, now that the bell is inside the drawer. */}
        {unread ? <span className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-header" /> : null}
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
