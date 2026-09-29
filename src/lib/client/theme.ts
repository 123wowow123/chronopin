'use client';

import { useSyncExternalStore } from 'react';
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from '@/lib/theme';

const listeners = new Set<() => void>();
const SYSTEM_LIGHT = '(prefers-color-scheme: light)';

function stored(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== 'system') return preference;
  return window.matchMedia(SYSTEM_LIGHT).matches ? 'light' : 'dark';
}

// Puts the stored preference on the page as data-theme on <html>, what the CSS
// keys off. The same as the layout's inline script, which only runs on full
// page loads.
export function applyTheme() {
  document.documentElement.setAttribute('data-theme', resolveTheme(stored()));
}

// Remember a preference on this browser and show it straight away.
export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
  applyTheme();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it, or the system flipped while following the system.
  const onChange = () => {
    applyTheme();
    listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  const system = window.matchMedia(SYSTEM_LIGHT);
  window.addEventListener('storage', onStorage);
  system.addEventListener('change', onChange);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    system.removeEventListener('change', onChange);
  };
}

// The stored preference. The default during server rendering and hydration.
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, stored, () => DEFAULT_THEME_PREFERENCE);
}

// The theme showing, with 'system' worked out. The server cannot know the
// device's setting, so it renders dark for a 'system' default.
const SERVER_THEME: Theme = DEFAULT_THEME_PREFERENCE === 'light' ? 'light' : 'dark';

export function useResolvedTheme(): Theme {
  return useSyncExternalStore(subscribe, () => resolveTheme(stored()), () => SERVER_THEME);
}
