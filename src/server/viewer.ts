// Per-request facts about the visitor, for server components.

import { cookies } from 'next/headers';
import { cache } from 'react';
import { getUser } from './auth';
import type User from './model/user';

const DEFAULT_TIME_ZONE = 'UTC';

// The visitor's time zone from the tz cookie (set by TimeZoneSync), or UTC
// for crawlers and first visits.
export const viewerTimeZone = cache(async (): Promise<string> => {
  const value = (await cookies()).get('tz')?.value;
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
});

export const viewerUser = cache(async (): Promise<User | null> => getUser());
