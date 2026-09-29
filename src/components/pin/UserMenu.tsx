'use client';

import { useCallback, useState } from 'react';
import { PopMenu, PopMenuItem } from '@/components/ui/PopMenu';
import { blockUser, unblockUser, type BlockedUser } from '@/lib/client/blocks';
import { useT } from '@/lib/client/i18n';

// A person's other actions, behind a three-dot menu (the user: search's
// card), set as the pin menu's are: Block, asked first, or Unblock once they
// are blocked.
export function UserMenu({ user, blocked }: { user: BlockedUser; blocked: boolean }) {
  const t = useT();
  const [view, setView] = useState<'actions' | 'confirm' | 'failed'>('actions');
  const reset = useCallback(() => setView('actions'), []);

  return (
    <PopMenu wide onClose={reset}>
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
            <PopMenuItem icon="user-x" title={t('pin.unblockName', { name: user.userName })} onClick={() => run(() => unblockUser(user.id))} />
          ) : (
            <PopMenuItem icon="user-x" title={t('pin.blockName', { name: user.userName })} hint={t('pin.blockUserHint')} onClick={() => setView('confirm')} />
          )
        ) : view === 'confirm' ? (
          <>
            <p className="px-3 pt-1.5 pb-2 text-sm text-subtle">{t('comments.blockConfirm', { name: user.userName })}</p>
            <PopMenuItem icon="user-x" danger title={t('pin.blockName', { name: user.userName })} onClick={() => run(() => blockUser(user))} />
            <PopMenuItem icon="close" title={t('common.cancel')} onClick={() => close(true)} />
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
