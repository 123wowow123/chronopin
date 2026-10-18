'use client';

import { useSyncExternalStore } from 'react';

export const TZ_COOKIE = 'tz';

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// The viewer's time zone. During server rendering and hydration it is the
// zone the server rendered with (from the tz cookie), so the markup matches;
// it switches to the browser's own zone right after.
export function useTimeZone(serverTimeZone: string): string {
  return useSyncExternalStore(
    () => () => {},
    browserTimeZone,
    () => serverTimeZone,
  );
}
