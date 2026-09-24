'use client';

import { useCallback, useState } from 'react';
import { PopMenu, PopMenuDivider, PopMenuItem } from '@/components/ui/PopMenu';
import { blockCompany, blockUser, unblockCompany, unblockUser, useBlocks } from '@/lib/client/blocks';
import { useT } from '@/lib/client/i18n';
import { markNotInterested, undoNotInterested, useNotInterested } from '@/lib/client/notInterested';
import { useSession } from '@/lib/client/session';
import type { PinJson } from '@/lib/types';

export type MenuPin = Pick<PinJson, 'id' | 'user' | 'companyId' | 'company' | 'companyLogoUrl'>;

type View = 'actions' | 'blockUser' | 'blockCompany' | 'failed';

// A pin's other actions, behind a three-dot menu on its card and its page, as
// Facebook's post menu has them - an icon, the action, and what it does:
// - Not interested (0077): the pin leaves the reader's timeline, search and
//   "More like this" (or Show this pin again, once it has)
// - Block its author (0076), asked first
// - Block its company (0078), asked first
// Once blocked (seen on the pin's own page), the last two offer Unblock. Only
// for a signed-in reader, as everything in it needs an account.
export function PinMenu({
  pin,
  onPage = false,
  buttonClassName,
  iconClassName,
}: {
  pin: MenuPin;
  // The pin's own page, where the cards below it have menus of their own.
  onPage?: boolean;
  buttonClassName?: string;
  iconClassName?: string;
}) {
  const t = useT();
  const { user, isLoggedIn } = useSession();
  const notInterested = useNotInterested();
  const blocks = useBlocks();
  const [view, setView] = useState<View>('actions');
  const reset = useCallback(() => setView('actions'), []);

  const marked = notInterested.ids.has(pin.id);
  const author = pin.user?.id && pin.user.userName && pin.user.id !== user?.id ? { id: pin.user.id, userName: pin.user.userName, pictureUrl: pin.user.pictureUrl ?? null } : null;
  const company = pin.companyId && pin.company ? { id: pin.companyId, name: pin.company, logoUrl: pin.companyLogoUrl ?? null } : null;
  const authorBlocked = !!author && blocks.ids.has(author.id);
  const companyBlocked = !!company && blocks.companyIds.has(company.id);

  if (!isLoggedIn) return null;
  return (
    <PopMenu label={onPage ? t('pin.actions') : undefined} wide buttonClassName={buttonClassName} iconClassName={iconClassName} onClose={reset}>
      {(close) => {
        const run = async (action: () => Promise<void>) => {
          try {
            await action();
            close(true);
          } catch {
            setView('failed');
          }
        };
        if (view === 'failed') {
          return (
            <p role="status" className="px-3 py-2 text-sm text-danger">
              {t('pin.notInterestedFailed')}
            </p>
          );
        }
        if (view === 'blockUser' && author) {
          return (
            <>
              <p className="px-3 pt-1.5 pb-2 text-sm text-subtle">{t('comments.blockConfirm', { name: author.userName })}</p>
              <PopMenuItem icon="user-x" danger title={t('pin.blockName', { name: author.userName })} onClick={() => run(() => blockUser(author))} />
              <PopMenuItem icon="close" title={t('common.cancel')} onClick={() => close(true)} />
            </>
          );
        }
        if (view === 'blockCompany' && company) {
          return (
            <>
              <p className="px-3 pt-1.5 pb-2 text-sm text-subtle">{t('pin.blockCompanyConfirm', { name: company.name })}</p>
              <PopMenuItem icon="ban" danger title={t('pin.blockName', { name: company.name })} onClick={() => run(() => blockCompany(company))} />
              <PopMenuItem icon="close" title={t('common.cancel')} onClick={() => close(true)} />
            </>
          );
        }
        return (
          <>
            {marked ? (
              <PopMenuItem icon="eye" title={t('pin.showAgain')} hint={t('pin.showAgainHint')} onClick={() => run(() => undoNotInterested(pin.id))} />
            ) : (
              <PopMenuItem icon="eye-off" title={t('pin.notInterested')} hint={t('pin.notInterestedHint')} onClick={() => run(() => markNotInterested(pin.id))} />
            )}
            {author || company ? <PopMenuDivider /> : null}
            {author ? (
              authorBlocked ? (
                <PopMenuItem icon="user-x" title={t('pin.unblockName', { name: author.userName })} onClick={() => run(() => unblockUser(author.id))} />
              ) : (
                <PopMenuItem icon="user-x" title={t('pin.blockName', { name: author.userName })} hint={t('pin.blockUserHint')} onClick={() => setView('blockUser')} />
              )
            ) : null}
            {company ? (
              companyBlocked ? (
                <PopMenuItem icon="ban" title={t('pin.unblockName', { name: company.name })} onClick={() => run(() => unblockCompany(company.id))} />
              ) : (
                <PopMenuItem
                  icon="ban"
                  title={t('pin.blockName', { name: company.name })}
                  hint={t('pin.blockCompanyHint', { name: company.name })}
                  onClick={() => setView('blockCompany')}
                />
              )
            ) : null}
          </>
        );
      }}
    </PopMenu>
  );
}
