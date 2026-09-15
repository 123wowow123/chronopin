'use client';

import { formatPosted, formatStart } from '@/lib/format';
import { useTimeZone } from '@/lib/client/timeZone';

// A date shown in the viewer's own time zone, with the instant in datetime
// for machines.
export function PostedTime({ value, serverTimeZone }: { value: string; serverTimeZone: string }) {
  const timeZone = useTimeZone(serverTimeZone);
  return <time dateTime={value}>{formatPosted(value, timeZone)}</time>;
}

export function StartTime({
  pin,
  serverTimeZone,
  allDaySuffix,
}: {
  pin: { utcStartDateTime: string; allDay?: boolean };
  serverTimeZone: string;
  allDaySuffix?: boolean;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  return <time dateTime={pin.utcStartDateTime}>{formatStart(pin, timeZone, { allDaySuffix })}</time>;
}
