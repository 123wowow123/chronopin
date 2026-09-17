'use client';

import { daysAway, daysBetween, formatPosted, formatStart } from '@/lib/format';
import { pinDayKey } from '@/lib/timeline';
import { useTimeZone } from '@/lib/client/timeZone';
import { Icon } from '@/components/ui/Icon';

// A date shown in the viewer's own time zone, with the instant in datetime
// for machines. With dateOnly the time moves to the hover title.
export function PostedTime({ value, serverTimeZone, dateOnly }: { value: string; serverTimeZone: string; dateOnly?: boolean }) {
  const timeZone = useTimeZone(serverTimeZone);
  return (
    <time dateTime={value} title={dateOnly ? `Posted ${formatPosted(value, timeZone)}` : undefined}>
      {formatPosted(value, timeZone, { dateOnly })}
    </time>
  );
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

// Past pins in the map's past colour, future ones in its future colour, today in the timeline's amber.
const DISTANCE_CLASS = {
  past: 'bg-past/12 text-past ring-past/30',
  future: 'bg-future/12 text-future ring-future/30',
  today: 'bg-tag-today/15 text-warning-soft ring-tag-today/30',
};

// "3 days ago", "in 5 days" or "Today" beside a card's start date, away from
// the timeline, where no day tag says so. The title keeps the exact days.
export function StartDistance({ pin, todayKey, serverTimeZone }: { pin: { utcStartDateTime: string; allDay?: boolean }; todayKey: string; serverTimeZone: string }) {
  const timeZone = useTimeZone(serverTimeZone);
  const day = pinDayKey(pin, timeZone);
  const days = daysBetween(todayKey, day);
  const count = Math.abs(days);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px] font-semibold whitespace-nowrap tabular-nums ring-1 ring-inset ${DISTANCE_CLASS[days > 0 ? 'future' : days < 0 ? 'past' : 'today']}`}
      title={days ? `${count.toLocaleString('en-US')} ${count === 1 ? 'day' : 'days'} ${days > 0 ? 'from now' : 'ago'}` : undefined}
    >
      <Icon name="clock" className="size-3" />
      {daysAway(todayKey, day)}
    </span>
  );
}
