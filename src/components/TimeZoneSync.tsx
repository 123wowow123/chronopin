'use client';

import { useRouter } from '@/lib/client/navigation';
import { useEffect } from 'react';
import { browserTimeZone, TZ_COOKIE } from '@/lib/client/timeZone';

// Server-rendered pages group the timeline by the viewer's calendar day, which
// needs their time zone. The server reads it from this cookie; on a first
// visit (or after travelling) the cookie is set and the page re-rendered.
export function TimeZoneSync() {
  const router = useRouter();
  useEffect(() => {
    const zone = browserTimeZone();
    const current = document.cookie.match(new RegExp(`(?:^|; )${TZ_COOKIE}=([^;]*)`))?.[1];
    if (current && decodeURIComponent(current) === zone) {
      return;
    }
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
