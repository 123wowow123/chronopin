// Per-request facts about the visitor, for server components.

import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { identifyBot } from '@/lib/bots';
import { getUser } from './auth';
import type User from './model/user';

const DEFAULT_TIME_ZONE = 'UTC';

// The visitor's time zone from the tz cookie (set by TimeZoneSync), or UTC
// for crawlers and first visits.
export const viewerTimeZone = cache(async (): Promise<string> => timeZoneOrUtc((await cookies()).get('tz')?.value));

// A tz cookie's value if it names a real zone, else UTC.
export function timeZoneOrUtc(value: string | undefined): string {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

// A request's zone, from the same cookie: for API routes, which search by the
// viewer's days (date:, posted:).
export function requestTimeZone(request: { cookies: { get(name: string): { value: string } | undefined } }): string {
  return timeZoneOrUtc(request.cookies.get('tz')?.value);
}

export const viewerUser = cache(async (): Promise<User | null> => getUser());

// Whether the visitor is a crawler or script by its user agent (a request
// with none counts as one). Work a page read would start on the Anthropic key
// is for people only: crawlers must never spend credit.
export const viewerIsBot = cache(async (): Promise<boolean> => identifyBot((await headers()).get('user-agent')) != null);
