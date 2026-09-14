'use client';

import { formatDayKey, timespan, weekdayPlanet } from '@/lib/format';
import type { Bag } from '@/lib/timeline';
import { PinCard } from '@/components/pin/PinCard';

// Beside the rail (lg) tags are a fixed-width column; above the cards on
// narrow screens they share one row.
const tagBase = 'tag-arrow shrink-0 overflow-visible max-lg:w-auto max-lg:min-w-0 max-lg:flex-1';

function Tag({ bg, children, title, className = '' }: { bg: string; children: React.ReactNode; title?: string; className?: string }) {
  return (
    <div className={`${tagBase} ${className}`} style={{ background: bg, ['--tag-bg' as string]: bg }} title={title}>
      <span className="block truncate px-1 leading-[1.1]">{children}</span>
    </div>
  );
}

export const TAG_COLORS = {
  date: 'var(--color-tag)',
  countdown: 'var(--color-tag-countdown)',
  today: 'var(--color-tag-today)',
  trivia: 'var(--color-tag-trivia)',
};

// One calendar day on the timeline: its tags (date, countdown, date markers,
// specialty day) beside or above its cards.
export function TimeBlock({
  bag,
  todayKey,
  specialtyDays,
  serverTimeZone,
  firstPinPriority,
}: {
  bag: Bag;
  todayKey: string;
  specialtyDays: string[];
  serverTimeZone: string;
  firstPinPriority?: boolean;
}) {
  const isToday = bag.day === todayKey;
  const planet = weekdayPlanet(bag.day);

  return (
    <section id={`day-${bag.day}`} aria-label={formatDayKey(bag.day)} className="relative mt-2.5 pt-12 lg:pt-0">
      <div
        className="absolute top-[23px] left-[140px] z-10 -ml-4 hidden size-[35px] items-center justify-center rounded-full border-[3px] border-planet-ring bg-planet text-lg leading-none text-white lg:flex"
        title={`${planet.planet}\n${planet.weekday}`}
      >
        <span className="font-astro opacity-80" aria-hidden>
          {planet.glyph}
        </span>
        <span className="sr-only">{planet.weekday}</span>
      </div>

      <div className="tag-row absolute top-0 right-0 left-0 flex overflow-hidden lg:top-[23px] lg:right-auto lg:w-[110px] lg:flex-col lg:gap-1.5 lg:overflow-visible">
        <Tag bg={isToday ? TAG_COLORS.today : TAG_COLORS.date}>
          <time dateTime={bag.day}>{formatDayKey(bag.day)}</time>
        </Tag>
        <Tag bg={isToday ? TAG_COLORS.today : TAG_COLORS.countdown} title={timespan(todayKey, bag.day)}>
          {timespan(todayKey, bag.day, 'y')}
        </Tag>
        {bag.dateTimes.map((dt) => (
          <Tag key={dt.id} bg={TAG_COLORS.trivia} title={dt.description || dt.title}>
            {dt.title}
          </Tag>
        ))}
        {specialtyDays.length ? <SpecialtyTag names={specialtyDays} /> : null}
      </div>

      {bag.pins.length ? (
        <ul className="gap-2.5 sm:columns-2 lg:ml-[170px] lg:max-w-[906px]" style={{ minHeight: `${23 + 42 * (2 + bag.dateTimes.length + (specialtyDays.length ? 1 : 0))}px` }}>
          {bag.pins.map((pin, i) => (
            <li key={pin.id} id={`pin-${pin.id}`} className="mb-2.5 break-inside-avoid">
              <PinCard pin={pin} serverTimeZone={serverTimeZone} priority={firstPinPriority && i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          className="min-h-[120px] lg:ml-[170px]"
          style={{ minHeight: `max(120px, ${23 + 42 * (2 + bag.dateTimes.length + (specialtyDays.length ? 1 : 0))}px)` }}
        >
          {bag.dateTimes.map((dt) => (
            <li key={dt.id} className="pb-px">
              <div className="font-bold text-subtle">{dt.title}</div>
              {dt.description ? <div className="mb-2 text-subtle">{dt.description}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The day's first specialty day ("National Peanut Day"); the title lists them
// all. Wraps to three lines, so it ends the stack.
export function SpecialtyTag({ names }: { names: string[] }) {
  return (
    <div
      className={`${tagBase} lg:text-xs`}
      style={{ background: TAG_COLORS.trivia, ['--tag-bg' as string]: TAG_COLORS.trivia }}
      title={names.join('\n')}
    >
      <span className="block truncate px-1 leading-[1.1] lg:line-clamp-3 lg:leading-[1.2] lg:whitespace-normal">{names[0]}</span>
    </div>
  );
}

export function TodayMarker({ specialtyDays }: { specialtyDays: string[] }) {
  return (
    <div className="relative mt-2.5 pt-10 lg:min-h-[36px] lg:pt-0">
      <div className="absolute top-[4px] left-[140px] z-10 -ml-[9px] hidden size-[18px] rounded-full border-2 border-tag-today bg-tag-today/60 lg:block" />
      <div className="tag-row absolute top-0 right-0 left-0 flex lg:right-auto lg:w-[110px] lg:flex-col lg:gap-1.5">
        <div id="today-marker" className={tagBase} style={{ background: TAG_COLORS.today, ['--tag-bg' as string]: TAG_COLORS.today }}>
          TODAY
        </div>
        {specialtyDays.length ? <SpecialtyTag names={specialtyDays} /> : null}
      </div>
      {specialtyDays.length ? <div className="hidden lg:block lg:h-[60px]" /> : null}
    </div>
  );
}
