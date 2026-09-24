'use client';

import { useCallback, useState } from 'react';
import { MENU_ITEM, PopMenu } from '@/components/ui/PopMenu';
import { blockUser, unblockUser, type BlockedUser } from '@/lib/client/blocks';
import { useT } from '@/lib/client/i18n';

// A person's other actions, behind a three-dot menu (the user: search's
// card): Block, asked first as in a comment's menu, or Unblock once they are
// blocked.
export function UserMenu({ user, blocked }: { user: BlockedUser; blocked: boolean }) {
  const t = useT();
  const [view, setView] = useState<'actions' | 'confirm' | 'failed'>('actions');
  const reset = useCallback(() => setView('actions'), []);

  return (
    <PopMenu wide={view !== 'actions'} onClose={reset}>
      {(close) => {
        const run = async (action: () => Promise<void>) => {
          try {
            await action();
            close(true);
          } catch {
            setView('failed');
          }
        };
        return view === 'actions' ? (
          blocked ? (
            <button type="button" role="menuitem" onClick={() => run(() => unblockUser(user.id))} className={MENU_ITEM}>
              {t('profile.unblock')}
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => setView('confirm')} className={MENU_ITEM}>
              {t('comments.block')}
            </button>
          )
        ) : view === 'confirm' ? (
          <>
            <p className="px-3 pt-1.5 pb-2 text-sm text-subtle">{t('comments.blockConfirm', { name: user.userName })}</p>
            <button type="button" role="menuitem" onClick={() => run(() => blockUser(user))} className={`${MENU_ITEM} text-danger`}>
              {t('comments.blockConfirmButton', { name: user.userName })}
            </button>
            <button type="button" role="menuitem" onClick={() => close(true)} className={MENU_ITEM}>
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <p role="status" className="px-3 py-2 text-sm text-danger">
            {blocked ? t('profile.unblockFailed') : t('comments.blockFailed')}
          </p>
        );
      }}
    </PopMenu>
  );
}
