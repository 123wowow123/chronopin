'use client';

import Link from '@/components/ui/Link';
import { usePathname, useRouter, useSearchParams } from '@/lib/client/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LogoMark } from '@/components/ui/LogoMark';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { drawerHeld, onCloseDrawer, onOpenDrawer, setCardsSlot, setControlsSlot, setDrawerScroller, useHasControls } from '@/lib/client/controlsDrawer';
import { leaveDrawer, settleDrawerMark, takeDrawerReturn } from '@/lib/client/drawerReturn';
import { useUnreadCount } from '@/lib/client/notifications';
import { hrefKeepingDate } from '@/lib/client/returnSpot';
import { useScrollLock } from '@/lib/client/scrollLock';
import { useSession } from '@/lib/client/session';
import { AuthLink, LogoutLink } from './AuthLink';
import { DrawerHighlights } from './DrawerHighlights';
import { ViewSwitch } from './NavMenu';
import { DrawerNotifications } from './NotificationBell';
import { searchHref, WATCHED } from './SearchBox';
import { useT } from '@/lib/client/i18n';

const itemClass =
  'flex items-center gap-4 rounded-full px-3 py-2 text-[17px] font-semibold text-ink hover:bg-raised hover:no-underline active:bg-raised-2 aria-[current=page]:text-accent';

// A swipe under way: where it started, and once it has moved far enough to
// tell, whether it runs across (drags the drawer) or down (scrolls it).
type Swipe = { x: number; y: number; time: number; width: number; axis: 'x' | 'y' | null };

const noSubscribe = () => () => {};

// A titled group of drawer rows, set off from the one above by a rule.
// hideTitle: the section's own first row already says it (the filters'
// panel is headed "Filters"), so the label is only for screen readers.
function DrawerSection({ title, hideTitle = false, className = '', children }: { title: string; hideTitle?: boolean; className?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={`border-t border-line px-2 pb-2.5 ${hideTitle ? 'pt-2.5' : 'pt-2'} ${className}`}>
      <div id={id} className={hideTitle ? 'sr-only' : 'px-3 pt-1 pb-1 text-xs font-semibold tracking-wider text-subtle uppercase'}>
        {title}
      </div>
      {children}
    </div>
  );
}

// The mark at the head of the drawer, standing where the button that opened
// it stood: the site's logo, which becomes that button's three lines as the
// panel slides in, and the logo again as it leaves. The two share one box and
// cross over inside the panel's own 300ms - the logo turns and shrinks away,
// then the lines draw in from the left, each a little after the one above.
//
// The lines are drawn as three rules rather than the menu icon's one path
// (16 long, 2 thick, 3 apart in a 24 box, as src/components/ui/Icon.tsx has
// them), since a path cannot arrive a line at a time. Box for box they are
// the navbar's button, and the row they sit in is the navbar's row, so the
// three lines come to rest exactly over the three the reader pressed.
function DrawerMark({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="grid size-7 place-items-center">
      <LogoMark
        className={`col-start-1 row-start-1 size-7 drop-shadow-[0_2px_6px_rgb(244_63_94/0.35)] transition duration-300 ease-out motion-reduce:transition-none ${
          open ? '-translate-x-1 scale-75 -rotate-12 opacity-0' : 'translate-x-0 scale-100 rotate-0 opacity-100'
        }`}
      />
      <span className="col-start-1 row-start-1 flex size-6 flex-col justify-center gap-[3px]">
        {[0, 1, 2].map((line) => (
          <span
            key={line}
            style={{ transitionDelay: open ? `${70 + line * 70}ms` : '0ms' }}
            className={`h-[2px] w-4 self-center rounded-full bg-current transition duration-200 ease-out motion-reduce:transition-none ${
              open ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
            }`}
          />
        ))}
      </span>
    </span>
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
  const t = useT();
  const unread = useUnreadCount(!!user);
  // Whether the page showing has filters to lend the drawer (the timeline and
  // search results do; a pin page does not).
  const hasControls = useHasControls();
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
    // Not for a tag picked in the drawer's own filters, whose search is the
    // change of page (src/lib/client/controlsDrawer.ts).
    if (!drawerHeld()) setOpen(false);
  }

  useScrollLock(open);

  useEffect(() => onCloseDrawer(() => setOpen(false)), []);
  // Back from the big tag cloud, which was opened from in here.
  useEffect(() => onOpenDrawer(() => setOpen(true)), []);

  // Back from the profile page's "Menu" button: the page it was opened from
  // is showing again, so the drawer is too (src/lib/client/drawerReturn.ts).
  // A frame after that page is back, so the drawer slides in over it - and
  // after the close above, which any change of page makes.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      settleDrawerMark(pathname);
      if (takeDrawerReturn()) setOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

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
    // The filter sliders in here are dragged across, so a touch that starts on
    // one is the slider's; the drawer stays where it is.
    if ((event.target as Element).closest('[data-no-swipe]')) {
      swipe.current = null;
      return;
    }
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

  // A row to one of the drawer's own pages, which marks the trip so the page's
  // back arrow can bring the reader back here (src/lib/client/drawerReturn.ts).
  const link = (href: string, icon: IconName, label: string) => (
    <Link href={href} aria-current={pathname === href ? 'page' : undefined} onClick={() => leaveDrawer(href)} className={itemClass}>
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
    const href = searchHref(onMap, searching ? params.get('q') || '' : '', watchedOnly ? '' : WATCHED);
    // Turning Watched off widens the search, which stays on the same date.
    router.push(watchedOnly ? hrefKeepingDate(href) : href);
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
        ref={(element) => {
          panelRef.current = element;
          setDrawerScroller(element);
          return () => setDrawerScroller(null);
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
        tabIndex={-1}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(26rem,90vw)] touch-pan-y flex-col overflow-y-auto overscroll-contain bg-header pl-[env(safe-area-inset-left)] shadow-2xl shadow-shade/50 outline-none transition-[translate,visibility] duration-300 ease-out ${
          open ? 'translate-x-0' : 'invisible -translate-x-full'
        }`}
        style={dragging ? { translate: `${drag * 100}% 0`, transition: 'none' } : undefined}
      >
        {/* The navbar's own row, signed in or out: 52px tall with the same
            side padding, so the mark in it lands on the menu button underneath
            and the panel reads as the bar opening out. It stays put while the
            rest scrolls under it, so the lines stay over that button. */}
        <div className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center gap-3 bg-header px-3">
          {/* The menu button in its open state, where the navbar's own sits:
              pressing it puts the drawer away again. */}
          <button
            type="button"
            className="-ml-1 shrink-0 rounded-full p-1 text-muted hover:bg-raised hover:text-ink"
            aria-label={t('nav.closeMenu')}
            onClick={() => setOpen(false)}
          >
            <DrawerMark open={open} />
          </button>
          {/* A plain link, not next/link: going home reloads the page, fresh from today. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="-mx-2 min-w-0 truncate rounded-lg px-2 py-1 font-display text-lg font-semibold tracking-tight text-ink transition-colors hover:bg-raised hover:no-underline active:bg-raised-2">
            Chronopin
          </a>
          {/* No close button at the far end: the menu mark above, a tap on
              the dimmed page, Escape or a swipe all put the drawer away. */}
        </div>

        {/* Signed in, the account under it - and the way to its profile and
            settings, as at the head of the wide screen's account menu
            (SignedInAs in NavMenu): the handle, with where it goes under it,
            rather than a row further down saying the same thing again. */}
        {user ? (
          <div className="px-2 pb-3">
            <Link href="/profile" onClick={() => leaveDrawer('/profile')} className="flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-raised hover:no-underline">
              <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-11 text-base" />
              <span className="min-w-0">
                <span className="block truncate text-lg leading-tight font-bold text-ink">{user.userName}</span>
                <span className="block truncate text-sm text-subtle">{t('nav.profileSettings')}</span>
              </span>
              {/* 20px from the edge, as every other row's chevron and switch is. */}
              <Icon name="chevron" className="mr-1 ml-auto size-4 shrink-0 -rotate-90 text-subtle" />
            </Link>
          </div>
        ) : null}

        {/* The one thing to do first: make a pin, or sign in to be able to. */}
        <div className="px-4 pb-4">
          {user ? (
            <Link href="/create" className="btn btn-primary flex py-2.5">
              <Icon name="plus" className="size-4" />
              {t('nav.createPin')}
            </Link>
          ) : (
            <AuthLink to="/login" className="btn btn-primary flex py-2.5">
              {t('nav.logIn')}
            </AuthLink>
          )}
        </div>

        <nav aria-label={t('nav.main')} className="flex-1">
          {/* What the page shows. */}
          <DrawerSection title={t('nav.browse')}>
            {/* Room under the switch: the watched toggle is a filter, not a
                third view, and butted against it the two read as one control. */}
            <div className="px-1 pb-3">
              <ViewSwitch pathname={pathname} />
            </div>
            {user ? (
              <button type="button" role="switch" aria-checked={watchedOnly} onClick={toggleWatched} className={`w-full ${itemClass}`}>
                <Icon name="eye" className={`size-6 ${watchedOnly ? 'text-link' : ''}`} />
                {t('nav.watchedOnly')}
                <span aria-hidden className={`ml-auto flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${watchedOnly ? 'bg-accent' : 'bg-raised-2'}`}>
                  <span className={`size-5 rounded-full bg-white shadow transition-transform ${watchedOnly ? 'translate-x-4' : ''}`} />
                </span>
              </button>
            ) : null}
          </DrawerSection>
          {/* What the timeline or the search below is filtered to: its own
              panels, lent to the drawer while the screen is too narrow to
              float them beside the cards. */}
          {/* What the search is about (a searched user or company): above the
              filters, not among them. Shut while no page fills it. */}
          {hasControls ? (
            <DrawerSection title={t('nav.searched')} hideTitle className="has-[[data-drawer-cards]:empty]:hidden">
              <div ref={setCardsSlot} data-drawer-cards className="flex flex-col gap-2 px-1 pb-0.5" />
            </DrawerSection>
          ) : null}
          {hasControls ? (
            <DrawerSection title={t('controls.filters')} hideTitle>
              <div ref={setControlsSlot} data-drawer-controls className="flex flex-col gap-2 px-1 pb-0.5" />
            </DrawerSection>
          ) : null}
          {/* Trending and new pins: under the filters when signed out, and
              under the notifications when signed in. Each row names itself,
              so the section's title is for screen readers only. */}
          {user ? null : (
            <DrawerSection title={`${t('trending.heading')}, ${t('newPins.heading')}`} hideTitle>
              <DrawerHighlights drawerOpen={open} itemClass={itemClass} />
            </DrawerSection>
          )}
          {user ? (
            <>
              <DrawerSection title={t('nav.you')}>
                <DrawerNotifications className={itemClass} current={pathname === '/notifications'} onClick={() => leaveDrawer('/notifications')} />
                <DrawerHighlights drawerOpen={open} itemClass={itemClass} />
              </DrawerSection>
              {isAdmin ? <DrawerSection title={t('nav.admin')}>{link('/admin/views', 'shield', t('nav.dashboard'))}</DrawerSection> : null}
            </>
          ) : null}
        </nav>

        {user ? (
          <div className="border-t border-line px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <LogoutLink className={itemClass}>
              <Icon name="logout" className="size-6" />
              {t('nav.logOut')}
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
        aria-label={unread ? t('nav.openMenuUnread', { count: unread }) : t('nav.openMenu')}
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
