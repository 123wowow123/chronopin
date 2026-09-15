// Light or dark colours. A visitor's choice lives in localStorage so the inline
// script in the root layout can apply it before the first paint (the server
// HTML is cached and never depends on who is looking); a signed-in user's
// choice is also saved on their account, so it follows them to other devices.

export const THEME_PREFERENCES = ['dark', 'light', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type Theme = Exclude<ThemePreference, 'system'>;

// Nothing chosen follows the device's light or dark setting.
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';
export const THEME_STORAGE_KEY = 'theme';

// The browser chrome (theme-color, set by ThemeSync) matches the navbar.
export const THEME_COLORS: Record<Theme, string> = { dark: '#13161b', light: '#ffffff' };

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

// Runs first in <body> while the HTML is parsed: sets data-theme on <html> from the
// stored preference. Kept in step with applyTheme in ./client/theme.ts.
export const themeScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${JSON.stringify(THEME_PREFERENCES)}.indexOf(p)<0)p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};if(p==="system")p=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.setAttribute("data-theme",p)}catch(e){}})()`;
