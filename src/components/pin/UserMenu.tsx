'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { blockUser, unblockUser, type BlockedUser } from '@/lib/client/blocks';
import { useT } from '@/lib/client/i18n';

// A person's other actions, behind a vertical three-dot button (the user:
// search's card): Block, asked first as in a comment's menu, or Unblock once
// they are blocked. It opens downward, the card being at the top of the page.
// Escape or a click elsewhere shuts it, and the focus goes back to the button.
export function UserMenu({ user, blocked }: { user: BlockedUser; blocked: boolean }) {
  const t = useT();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'actions' | 'confirm' | 'failed'>('actions');
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    setView('actions');
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Element)) close(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', key);
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

  const item = 'block w-full rounded-lg px-3 py-2 text-left text-base font-medium hover:bg-raised focus-visible:bg-raised focus-visible:outline-none';
  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('comments.moreActions')}
        title={t('comments.moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink focus-visible:bg-raised"
      >
        <Icon name="dots-vertical" className="size-5" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className={`absolute top-full right-0 z-30 mt-2.5 ${view === 'actions' ? 'w-48' : 'w-64'} rounded-xl border border-tint/[0.07] bg-panel p-1.5 text-ink shadow-2xl shadow-shade/40`}
        >
          <span aria-hidden className="absolute -top-1.5 right-3 size-3 rotate-45 border-t border-l border-tint/[0.07] bg-panel" />
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
        </div>
      ) : null}
    </span>
  );
}
