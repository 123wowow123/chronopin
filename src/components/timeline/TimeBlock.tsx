'use client';

import Link from 'next/link';
import { stackDuplicates } from '@/lib/duplicates';
import { formatDayKey, timespan, weekdayPlanet } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import type { Bag } from '@/lib/timeline';
import type { PinJson } from '@/lib/types';
import { PinCard } from '@/components/pin/PinCard';

// Beside the rail (lg) tags are a fixed-width column; above the cards on
// narrow screens they share one row, extra tags (date markers, specialty days)
// shrinking into what the date and countdown leave so the date is never cut short.
const tagBase = 'tag lg:w-full';
const leadTag = 'shrink-0';
const extraTag = 'min-w-0';
const tagRow = 'absolute top-0 right-0 left-0 flex gap-1.5 overflow-hidden lg:right-auto lg:w-[110px] lg:flex-col lg:overflow-visible';

type TagVariant = 'date' | 'countdown' | 'today' | 'trivia';

// Beside the rail, a `wrap` tag uses the specialty day's small type and wraps
// to two lines (still within the 42px a tag is allowed) instead of cutting off.
function Tag({ variant, children, title, className = '', wrap = false }: { variant: TagVariant; children: React.ReactNode; title?: string; className?: string; wrap?: boolean }) {
  return (
    <div className={`${tagBase} tag-${variant} ${wrap ? 'lg:text-xs lg:leading-4' : ''} ${className}`} title={title}>
      <span className={`block truncate ${wrap ? 'lg:line-clamp-2 lg:whitespace-normal' : ''}`}>{children}</span>
    </div>
  );
}

// One calendar day on the timeline: its tags (date, countdown, date markers,
// specialty day) beside or above its cards.
export function TimeBlock({
  id,
  bag,
  todayKey,
  specialtyDays,
  serverTimeZone,
  firstPinPriority,
}: {
  // Defaults to the day's id, which is only unique in date order.
  id?: string;
  bag: Bag;
  todayKey: string;
  specialtyDays: string[];
  serverTimeZone: string;
  firstPinPriority?: boolean;
}) {
  const isToday = bag.day === todayKey;
  const planet = weekdayPlanet(bag.day);
  const tagsHeight = 26 + 42 * (2 + bag.dateTimes.length + (specialtyDays.length ? 1 : 0));

  return (
    <section id={id ?? `day-${bag.day}`} aria-label={formatDayKey(bag.day)} className="relative mt-2.5 pt-10 max-lg:mt-6 lg:pt-0">
      <div
        className={`rail-marker absolute top-6 left-[140px] z-10 -ml-4 hidden size-8 items-center justify-center rounded-full text-base leading-none lg:flex ${isToday ? 'rail-marker-today' : ''}`}
        title={`${planet.planet}\n${planet.weekday}`}
      >
        <span className="font-astro" aria-hidden>
          {planet.glyph}
        </span>
        <span className="sr-only">{planet.weekday}</span>
      </div>

      <div className={`${tagRow} lg:top-[26px]`}>
        <Tag variant={isToday ? 'today' : 'date'} className={`${leadTag} tag-link`}>
          <time dateTime={bag.day}>{formatDayKey(bag.day)}</time>
        </Tag>
        <Tag variant={isToday ? 'today' : 'countdown'} title={timespan(todayKey, bag.day)} className={leadTag}>
          {timespan(todayKey, bag.day, 'y')}
        </Tag>
        {/* On phones only the first extra tag fits beside the date and countdown; the rest show from sm up. */}
        {bag.dateTimes.map((dt, i) => (
          <Tag key={dt.id} variant="trivia" wrap title={dt.description || dt.title} className={`${extraTag} ${i > 0 ? 'max-sm:hidden' : ''}`}>
            {dt.title}
          </Tag>
        ))}
        {specialtyDays.length ? <SpecialtyTag names={specialtyDays} className={bag.dateTimes.length ? 'max-sm:hidden' : ''} /> : null}
      </div>

      {bag.pins.length ? (
        <PinColumns tagsHeight={tagsHeight}>
          {stackDuplicates(bag.pins).map(({ pin, hidden }, i) => (
            <div key={pin.id} id={`pin-${pin.id}`} data-start={pin.utcStartDateTime} role="listitem" className="mb-2.5" style={{ order: i }}>
              {hidden.length ? (
                <DuplicateStack pin={pin} hiddenCount={hidden.length}>
                  <PinCard pin={pin} serverTimeZone={serverTimeZone} priority={firstPinPriority && i === 0} />
                </DuplicateStack>
              ) : (
                <PinCard pin={pin} serverTimeZone={serverTimeZone} priority={firstPinPriority && i === 0} />
              )}
            </div>
          ))}
        </PinColumns>
      ) : (
        // lg:pt-7 lines the first title up with the date tag and rail marker
        // (tags start 26px down; a 24px line centred on the 28px-tall tag).
        // The tag column's height is only reserved beside the rail; on narrow
        // screens the tags are one row above, so the day is just its titles.
        <ul
          className="lg:ml-[170px] lg:min-h-[max(120px,var(--tags-h))] lg:pt-7"
          style={{ ['--tags-h' as string]: `${tagsHeight}px` }}
        >
          {bag.dateTimes.map((dt) => (
            <li key={dt.id} className="pb-px">
              <div className="font-semibold text-muted">{dt.title}</div>
              {dt.description ? <div className="mb-2 text-subtle">{dt.description}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The day's cards fill across before down: from sm up they alternate between
// two columns (1 left, 2 right, 3 left...), each column stacking its own cards
// without gaps. On phones the columns dissolve (display: contents) into one
// list, and each card's `order` puts it back in date order.
function PinColumns({ tagsHeight, children }: { tagsHeight: number; children: React.ReactElement[] }) {
  const column = (parity: number) => (
    <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:flex-col">{children.filter((_, i) => i % 2 === parity)}</div>
  );
  return (
    <div role="list" className="flex flex-col sm:flex-row sm:gap-2.5 lg:ml-[170px] lg:min-h-(--tags-h) lg:max-w-[906px]" style={{ ['--tags-h' as string]: `${tagsHeight}px` }}>
      {column(0)}
      {column(1)}
    </div>
  );
}

// A card with its day's duplicates stacked behind it: the edges of two cards
// peek out below, and a link leads to the pin page's list of them.
function DuplicateStack({ pin, hiddenCount, children }: { pin: PinJson; hiddenCount: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="relative pb-3">
        <div aria-hidden className="absolute inset-x-4 bottom-0 h-8 rounded-b-xl border border-line bg-raised-2" />
        <div aria-hidden className="absolute inset-x-2 bottom-1.5 h-8 rounded-b-xl border border-line bg-raised" />
        <div className="relative">{children}</div>
      </div>
      <Link href={`${pinPath(pin)}#duplicates`} className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-subtle hover:text-link hover:no-underline">
        <span className="rounded-full bg-raised px-1.5 tabular-nums ring-1 ring-line ring-inset">+{hiddenCount}</span>
        {hiddenCount === 1 ? 'more pin of this' : 'more pins of this'}
      </Link>
    </div>
  );
}

// The day's first specialty day ("National Peanut Day"); the title lists them
// all. Wraps to three lines, so it ends the stack.
export function SpecialtyTag({ names, className = '' }: { names: string[]; className?: string }) {
  return (
    <div className={`${tagBase} tag-trivia ${extraTag} lg:text-xs lg:leading-4 ${className}`} title={names.join('\n')}>
      <span className="block truncate lg:line-clamp-3 lg:whitespace-normal">{names[0]}</span>
    </div>
  );
}

export function TodayMarker({ specialtyDays }: { specialtyDays: string[] }) {
  return (
    <div className="relative mt-2.5 pt-10 max-lg:mt-6 lg:min-h-[36px] lg:pt-0">
      <div className="today-dot absolute top-[7px] left-[140px] z-10 -ml-[7px] hidden size-3.5 rounded-full lg:block" />
      <div className={tagRow}>
        <div id="today-marker" className={`${tagBase} ${leadTag} tag-today tag-link uppercase tracking-wider lg:text-xs`} style={{ ['--tag-reach' as string]: '23px' }}>
          Today
        </div>
        {specialtyDays.length ? <SpecialtyTag names={specialtyDays} /> : null}
      </div>
      {specialtyDays.length ? <div className="hidden lg:block lg:h-[60px]" /> : null}
    </div>
  );
}
