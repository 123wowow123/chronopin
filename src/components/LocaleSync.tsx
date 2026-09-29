'use client';

import { useEffect } from 'react';
import { localeCookie, switchLocale, useLocale } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';

// Brings a signed-in account's saved language (Profile > Preferences) to this
// browser: the cookie takes it, and the page reloads in it. Only when the
// cookie disagrees - after signing in here, or a change on another device -
// so a /es link opened later is still shown in Spanish.
export function LocaleSync() {
  const locale = useLocale();
  const saved = useSession().user?.localePreference;

  useEffect(() => {
    if (saved && saved !== localeCookie()) {
      switchLocale(saved, locale, true);
    }
    // Only when the account's value arrives or changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  return null;
}
