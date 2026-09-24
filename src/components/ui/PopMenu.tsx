'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';

// A vertical three-dot button and the menu it opens, floating over the page
// itself (fixed, in document.body) so no card or panel it sits in can clip
// it: under the button, or over it when the button is too near the foot of
// the window, with a tail pointing at it. It follows the button when the page
// scrolls or the window resizes (a scroll still settling from the click that
// opened it must not shut it), and shuts once the button leaves the window.
// Escape or a click elsewhere shuts it too, and the focus goes back to the
// button. The
// menu's items are `children`, given a `close`; `onClose` lets the owner put
// back any step it moved the menu to (a confirm, a status).
export const MENU_ITEM =
  'block w-full rounded-lg px-3 py-2 text-left text-base font-medium hover:bg-ink/[0.07] focus-visible:bg-ink/[0.07] focus-visible:outline-none';

// An item as Facebook's post menu has them: an icon in a soft disc, the
// action in bold, and a line under it saying what it does.
export function PopMenuItem({
  icon,
  title,
  hint,
  danger = false,
  onClick,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-ink/[0.07] focus-visible:bg-ink/[0.07] focus-visible:outline-none"
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-ink/10 ${danger ? 'text-danger' : 'text-ink'}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0">
        <span className={`block truncate text-[15px] font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>{title}</span>
        {hint ? <span className="block text-xs leading-snug text-subtle">{hint}</span> : null}
      </span>
    </button>
  );
}

// A hairline between groups of items.
export function PopMenuDivider() {
  return <div role="separator" className="mx-2 my-1 h-px bg-ink/10" />;
}

// Room the menu wants under its button before it opens over it instead.
const ROOM_BELOW = 260;

type Place = { top?: number; bottom?: number; right: number };

// Where the menu hangs for a button at `box`, measured from the window's
// edges; `above` keeps the side it first opened on while it follows.
function placeFor(box: DOMRect, above?: boolean): Place {
  const right = window.innerWidth - box.right;
  const up = above ?? window.innerHeight - box.bottom < ROOM_BELOW;
  return up ? { bottom: window.innerHeight - box.top + 10, right } : { top: box.bottom + 10, right };
}

export function PopMenu({
  label,
  wide = false,
  buttonClassName = 'size-9',
  iconClassName = 'size-5',
  onClose,
  children,
}: {
  // The button's name; "More actions" when there is only one on the page's
  // part of it.
  label?: string;
  // Wide enough for items with hints, or a sentence (a confirm), not just a
  // word or two.
  wide?: boolean;
  buttonClassName?: string;
  iconClassName?: string;
  onClose?: () => void;
  children: (close: (refocus?: boolean) => void) => ReactNode;
}) {
  const t = useT();
  const menuId = useId();
  // Where the menu hangs, measured from the window's edges.
  const [open, setOpen] = useState<Place | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Counts close(true)s: each sends the focus back to the button once the
  // menu has shut.
  const [refocus, setRefocus] = useState(0);

  const close = useCallback(
    (andRefocus = false) => {
      setOpen(null);
      onClose?.();
      if (andRefocus) setRefocus((n) => n + 1);
    },
    [onClose],
  );

  useEffect(() => {
    if (refocus) buttonRef.current?.focus();
  }, [refocus]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  });

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    // Fixed to the window, so it is moved with its button, once a frame.
    let frame = 0;
    const above = open.bottom != null;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = buttonRef.current?.getBoundingClientRect();
        if (!box || box.bottom < 0 || box.top > window.innerHeight) return close(false);
        // Only moves an open menu: a frame that lands after close() must not
        // open it again.
        setOpen((was) => (was ? placeFor(box, above) : was));
      });
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', follow, true);
    window.addEventListener('resize', follow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', follow, true);
      window.removeEventListener('resize', follow);
    };
    // Only whether it is open matters here; its place changes as it follows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!open, close]);

  const above = open?.bottom != null;
  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label ?? t('comments.moreActions')}
        title={label ?? t('comments.moreActions')}
        aria-haspopup="menu"
        aria-expanded={!!open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          // A card's menu must not also follow the card's own links.
          event.preventDefault();
          event.stopPropagation();
          if (open) return close(false);
          setOpen(placeFor(buttonRef.current!.getBoundingClientRect()));
        }}
        className={`inline-flex shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:bg-raised ${
          open ? 'bg-raised text-ink' : ''
        } ${buttonClassName}`}
      >
        <Icon name="dots-vertical" className={iconClassName} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{ top: open.top, bottom: open.bottom, right: Math.max(8, open.right) }}
              className={`fixed z-50 ${wide ? 'w-80' : 'w-52'} max-w-[calc(100vw-1rem)] rounded-xl border border-ink/10 bg-popover p-1.5 text-ink shadow-2xl shadow-shade/40`}
            >
              <span
                aria-hidden
                className={`absolute right-3 size-3 rotate-45 border-ink/10 bg-popover ${above ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-t border-l'}`}
              />
              {children(close)}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
