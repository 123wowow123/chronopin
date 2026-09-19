'use client';

import { dayKeyIn, daysAway, daysBetween, formatDayKey, formatPosted, formatStart } from '@/lib/format';
import { pinDayKey } from '@/lib/timeline';
import { useTimeZone } from '@/lib/client/timeZone';
import { Icon } from '@/components/ui/Icon';
import { RefineLink } from '@/components/pin/RefineLink';

// A date shown in the viewer's own time zone, with the instant in datetime
// for machines. With dateOnly the time moves to the hover title. With search
// it links to the pins posted the same day (posted:, the viewer's day).
export function PostedTime({ value, serverTimeZone, dateOnly, search }: { value: string; serverTimeZone: string; dateOnly?: boolean; search?: boolean }) {
  const timeZone = useTimeZone(serverTimeZone);
  const time = (
    <time dateTime={value} title={dateOnly ? `Posted ${formatPosted(value, timeZone)}` : undefined}>
      {formatPosted(value, timeZone, { dateOnly })}
    </time>
  );
  if (!search) return time;
  const day = dayKeyIn(value, timeZone);
  return (
    <RefineLink field="posted" value={day} className="text-inherit hover:text-link hover:no-underline" title={`Show all pins posted on ${formatDayKey(day)}`}>
      {time}
    </RefineLink>
  );
}

export function StartTime({
  pin,
  serverTimeZone,
  allDaySuffix,
  search,
}: {
  pin: { utcStartDateTime: string; allDay?: boolean };
  serverTimeZone: string;
  allDaySuffix?: boolean;
  // Links to the pins starting the same day (date:, the day shown here).
  search?: boolean;
}) {
  const timeZone = useTimeZone(serverTimeZone);
  const time = <time dateTime={pin.utcStartDateTime}>{formatStart(pin, timeZone, { allDaySuffix })}</time>;
  if (!search) return time;
  const day = pinDayKey(pin, timeZone);
  return (
    <RefineLink field="date" value={day} className="text-inherit hover:text-link hover:no-underline" title={`Show all pins on ${formatDayKey(day)}`}>
      {time}
    </RefineLink>
  );
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
