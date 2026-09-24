'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { blockUser, unblockUser, type BlockedUser } from '@/lib/client/blocks';
import { useT } from '@/lib/client/i18n';

// A person's other actions, behind a vertical three-dot button (the user:
// search's card): Block, asked first as in a comment's menu, or Unblock once
// they are blocked. It opens downward, the card being at the top of the page,
// and floats over the page itself (fixed, in document.body): the controls
// panel the card sits in clips whatever spills out of it. Escape, a click
// elsewhere, a scroll or a resize shuts it, and the focus goes back to the
// button.
export function UserMenu({ user, blocked }: { user: BlockedUser; blocked: boolean }) {
  const t = useT();
  const menuId = useId();
  // Where the menu hangs: under the button, its right edge on the button's.
  const [open, setOpen] = useState<{ top: number; right: number } | null>(null);
  const [view, setView] = useState<'actions' | 'confirm' | 'failed'>('actions');
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(null);
    setView('actions');
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    // Fixed to where the button was: once the page moves, it would float free.
    const moved = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) close(false);
    };
    const resized = () => close(false);
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', moved, true);
    window.addEventListener('resize', resized);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', moved, true);
      window.removeEventListener('resize', resized);
    };
  }, [open, view, close]);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      close(true);
    } catch {
      setView('failed');
    }
  }

  const item = 'block w-full rounded-lg px-3 py-2 text-left text-base font-medium hover:bg-raised-2 focus-visible:bg-raised-2 focus-visible:outline-none';
  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('comments.moreActions')}
        title={t('comments.moreActions')}
        aria-haspopup="menu"
        aria-expanded={!!open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (open) return close(false);
          const box = buttonRef.current!.getBoundingClientRect();
          setOpen({ top: box.bottom + 10, right: window.innerWidth - box.right });
        }}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:bg-raised"
      >
        <Icon name="dots-vertical" className="size-5" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              style={{ top: open.top, right: open.right }}
              className={`fixed z-50 ${view === 'actions' ? 'w-48' : 'w-64'} max-w-[calc(100vw-2rem)] rounded-xl border border-raised-2 bg-popover p-1.5 text-ink shadow-2xl shadow-shade/40`}
            >
              <span aria-hidden className="absolute -top-1.5 right-3 size-3 rotate-45 border-t border-l border-raised-2 bg-popover" />
              {view === 'actions' ? (
                blocked ? (
                  <button type="button" role="menuitem" onClick={() => run(() => unblockUser(user.id))} className={item}>
                    {t('profile.unblock')}
                  </button>
                ) : (
                  <button type="button" role="menuitem" onClick={() => setView('confirm')} className={item}>
                    {t('comments.block')}
                  </button>
                )
              ) : view === 'confirm' ? (
                <>
                  <p className="px-3 pt-1.5 pb-2 text-sm text-subtle">{t('comments.blockConfirm', { name: user.userName })}</p>
                  <button type="button" role="menuitem" onClick={() => run(() => blockUser(user))} className={`${item} text-danger`}>
                    {t('comments.blockConfirmButton', { name: user.userName })}
                  </button>
                  <button type="button" role="menuitem" onClick={() => close(true)} className={item}>
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <p role="status" className="px-3 py-2 text-sm text-danger">
                  {blocked ? t('profile.unblockFailed') : t('comments.blockFailed')}
                </p>
              )}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
