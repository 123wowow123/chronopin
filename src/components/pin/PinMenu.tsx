'use client';

import { useCallback, useState } from 'react';
import { AuthLink } from '@/components/nav/AuthLink';
import { MENU_ITEM, PopMenu } from '@/components/ui/PopMenu';
import { useT } from '@/lib/client/i18n';
import { markNotInterested, undoNotInterested, useNotInterested } from '@/lib/client/notInterested';
import { useSession } from '@/lib/client/session';

// A pin's other actions, behind a three-dot menu on its card and its page:
// "Not interested" (0077), which leaves it out of the reader's timeline,
// search and "More like this", or "Show this pin again" once it is marked. A
// signed-out reader is sent to log in first.
export function PinMenu({
  pinId,
  onPage = false,
  buttonClassName,
  iconClassName,
}: {
  pinId: number;
  // The pin's own page, where the cards below it have menus of their own.
  onPage?: boolean;
  buttonClassName?: string;
  iconClassName?: string;
}) {
  const t = useT();
  const { isLoggedIn } = useSession();
  const { ids } = useNotInterested();
  const [failed, setFailed] = useState(false);
  const reset = useCallback(() => setFailed(false), []);
  const marked = ids.has(pinId);

  return (
    <PopMenu label={onPage ? t('pin.actions') : undefined} buttonClassName={buttonClassName} iconClassName={iconClassName} onClose={reset}>
      {(close) => {
        const run = async (action: () => Promise<void>) => {
          try {
            await action();
            close(true);
          } catch {
            setFailed(true);
          }
        };
        if (failed) {
          return (
            <p role="status" className="px-3 py-2 text-sm text-danger">
              {t('pin.notInterestedFailed')}
            </p>
          );
        }
        if (!isLoggedIn) {
          return (
            <AuthLink to="/login" className={MENU_ITEM}>
              {t('pin.notInterested')}
            </AuthLink>
          );
        }
        return marked ? (
          <button type="button" role="menuitem" onClick={() => run(() => undoNotInterested(pinId))} className={MENU_ITEM}>
            {t('pin.showAgain')}
          </button>
        ) : (
          <button type="button" role="menuitem" onClick={() => run(() => markNotInterested(pinId))} className={MENU_ITEM}>
            {t('pin.notInterested')}
          </button>
        );
      }}
    </PopMenu>
  );
}
