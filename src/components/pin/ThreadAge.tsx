'use client';

import { useNow } from '@/lib/client/now';

const DAY = 24 * 60 * 60 * 1000;

// Whole calendar days from the viewer's today to a pin's start day: an all-day
// pin's is its UTC date, any other's is the viewer's local day.
function daysFromToday(utcStartDateTime: string, allDay: boolean | undefined, now: number) {
  const start = new Date(utcStartDateTime);
  const day = allDay
    ? Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    : Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now);
  return Math.round((day - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY);
}

// How many days ago a thread pin started ("in 3 days" for one still to come).
export function ThreadAge({ start, allDay }: { start: string; allDay?: boolean }) {
  const now = useNow(60_000);
  if (!now || isNaN(new Date(start).getTime())) {
    return <span className="ml-auto h-5 w-20 shrink-0" />;
  }
  const days = daysFromToday(start, allDay, now);
  const n = Math.abs(days);
  const text = days === 0 ? 'today' : days < 0 ? `${n} ${n === 1 ? 'day' : 'days'} ago` : `in ${n} ${n === 1 ? 'day' : 'days'}`;
  return <span className="ml-auto shrink-0 pl-3 text-xs text-subtle tabular-nums">{text}</span>;
}
