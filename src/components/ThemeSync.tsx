'use client';

import { useEffect, useLayoutEffect } from 'react';
import { applyTheme, setThemePreference, useResolvedTheme, useThemePreference } from '@/lib/client/theme';
import { useSession } from '@/lib/client/session';
import { THEME_COLORS } from '@/lib/theme';

// Keeps the page's colours on the viewer's preference after the layout's
// inline script has set them: through the dev remount (which strips
// data-theme from <html>), system light/dark switches, other tabs, and a
// signed-in account's saved choice arriving from another device. Also owns
// the browser chrome colour (theme-color), which React hoists into <head>.
export function ThemeSync() {
  const preference = useThemePreference();
  const theme = useResolvedTheme();
  const saved = useSession().user?.themePreference;

  useLayoutEffect(applyTheme, [preference]);

  useEffect(() => {
    if (saved && saved !== preference) {
      setThemePreference(saved);
    }
    // Only when the account's value arrives or changes: a choice made on this
    // page is saved to the account too, so the two meet again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  return <meta name="theme-color" content={THEME_COLORS[theme]} />;
}
