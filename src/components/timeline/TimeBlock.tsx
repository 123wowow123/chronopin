'use client';

import Link from '@/components/ui/Link';
import { useRef } from 'react';
import { BAG_LIMIT, BAG_LIMIT_PHONE, sampleBag } from '@/lib/bagSample';
import { useImpression } from '@/lib/client/impressions';
import { stackDuplicates, type PinStack } from '@/lib/duplicates';
import { formatDayKey, lunarDate, moonPhase, timespan, weekdayPlanet } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import type { Bag } from '@/lib/timeline';
import type { PinJson } from '@/lib/types';
import type { personalWeigher } from '@/lib/userWiki';
import { PinCard } from '@/components/pin/PinCard';
import { useLocale, useT } from '@/lib/client/i18n';

// Beside the rail (lg) tags are a fixed-width column; above the cards on
// narrow screens they share one row, extra tags (date markers, specialty days)
// shrinking into what the date and countdown leave so the date is never cut short.
const tagBase = 'tag lg:w-full';
const leadTag = 'shrink-0';
const extraTag = 'min-w-0';
const tagRow = 'absolute top-0 right-0 left-0 flex gap-1.5 overflow-hidden lg:right-auto lg:w-[110px] lg:flex-col lg:overflow-visible';

type TagVariant = 'date' | 'countdown' | 'today' | 'trivia';

// A day's markers are trivia the site holds no pin for, so the chip hands the
// name to a web search in the viewer's language.
function triviaSearchUrl(name: string, locale: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}&hl=${locale}`;
}

// Beside the rail, a `wrap` tag uses the specialty day's small type and wraps
// to two lines (still within the 42px a tag is allowed) instead of cutting off.
// With an `href` the chip is that search link, opened in a new tab.
function Tag({ variant, children, title, className = '', wrap = false, href }: { variant: TagVariant; children: React.ReactNode; title?: string; className?: string; wrap?: boolean; href?: string }) {
  const chip = `${tagBase} tag-${variant} ${wrap ? 'lg:text-xs lg:leading-4' : ''} ${className}`;
  const label = <span className={`block truncate ${wrap ? 'lg:line-clamp-2 lg:whitespace-normal' : ''}`}>{children}</span>;
  return href ? (
    <a href={href} target="_blank" rel="noopener nofollow" className={chip} title={title}>
      {label}
    </a>
  ) : (
    <div className={chip} title={title}>
      {label}
    </div>
  );
}

function stackIds(stacks: PinStack<PinJson>[], id: number): number[] {
  const stack = stacks.find((s) => s.pin.id === id);
  return stack ? [id, ...stack.hidden.map((h) => h.id)] : [id];
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
  sample = false,
  focusId,
  daySearchHref,
  dayTotal,
  boost,
}: {
  // Defaults to the day's id, which is only unique in date order.
  id?: string;
  bag: Bag;
  todayKey: string;
  specialtyDays: string[];
  serverTimeZone: string;
  firstPinPriority?: boolean;
  // Cap the day at two rows of cards, the whole day a "View all" search away
  // (the timeline; search results show every match).
  sample?: boolean;
  // The pin the timeline opened on, never left behind "View all".
  focusId?: number | null;
  // The day as a full search page (date:), linked from "View all".
  daySearchHref?: (day: string) => string;
  // How many pins the day really has, when the loaded pages may hold only
  // some of them (a day at either end of what is loaded).
  dayTotal?: number;
  // How much more each pin weighs for this viewer (their preference wiki).
  boost?: ReturnType<typeof personalWeigher>;
}) {
  const t = useT();
  const { locale } = t;
  const stacks = stackDuplicates(bag.pins);
  // Seeded by today and the day: the pick holds through hydration and the
  // day's reloads, and turns over each day.
  const keep = focusId == null ? null : (stacks.find((s) => s.pin.id === focusId || s.hidden.some((h) => h.id === focusId))?.pin.id ?? null);
  // A card stands for its whole stack: opening any duplicate counts for it.
  const weigh = boost && ((pin: PinJson) => boost(pin, stackIds(stacks, pin.id)));
  const picked = sample && stacks.length > BAG_LIMIT_PHONE ? sampleBag(stacks.map((s) => s.pin), BAG_LIMIT, `${todayKey}:${bag.day}`, keep, weigh) : null;
  // The picked cards in date order, each with where it fell in the pick: from
  // sm up the whole pick shows, on phones only its first BAG_LIMIT_PHONE. The
  // rest are not drawn on the timeline at all, only on the day's search.
  const shown = stacks.map((stack) => ({ stack, rank: picked ? picked.indexOf(stack.pin.id) : 0 })).filter((s) => s.rank >= 0);
  // Pins of the day not loaded yet count as more, too (duplicates among them
  // cannot be told apart without loading them).
  const unloaded = Math.max(0, (dayTotal ?? 0) - bag.pins.length);
  const moreWide = stacks.length - shown.length + unloaded;
  const morePhone = stacks.length - Math.min(shown.length, BAG_LIMIT_PHONE) + unloaded;
  const firstShown = shown.findIndex((s) => s.rank < BAG_LIMIT_PHONE);
  const isToday = bag.day === todayKey;
  const planet = weekdayPlanet(bag.day, locale);
  const moon = moonPhase(bag.day, 16, locale);
  const lunar = lunarDate(bag.day, locale);
  const tagsHeight = 26 + 42 * (2 + (lunar ? 1 : 0) + bag.dateTimes.length + (specialtyDays.length ? 1 : 0));

  return (
    <section id={id ?? `day-${bag.day}`} aria-label={formatDayKey(bag.day, locale)} className="relative mt-2.5 pt-10 max-lg:mt-6 lg:pt-0">
      <div
        className={`rail-marker absolute top-6 cursor-default left-[140px] z-10 -ml-4 hidden size-8 items-center justify-center overflow-hidden rounded-full text-base leading-none lg:flex ${isToday ? 'rail-marker-today' : ''}`}
        title={`${planet.planet}\n${planet.weekday}\n${t('timeline.moonLit', { phase: moon.name, percent: Math.round(moon.illumination * 100) })}`}
      >
        {/* The circle is the day's moon: its lit part a soft tint behind the planet. */}
        <svg viewBox="0 0 32 32" className="absolute inset-0 size-full" aria-hidden>
          <path d={moon.path} fill="currentColor" opacity={0.22} />
        </svg>
        <span className="relative font-astro" aria-hidden>
          {planet.glyph}
        </span>
        <span className="sr-only">{planet.weekday}</span>
      </div>

      <div className={`${tagRow} lg:top-[26px]`}>
        <Tag variant={isToday ? 'today' : 'date'} className={`${leadTag} tag-link`}>
          <time dateTime={bag.day}>{formatDayKey(bag.day, locale)}</time>
        </Tag>
        <Tag variant={isToday ? 'today' : 'countdown'} title={timespan(todayKey, bag.day, 'd', locale)} className={leadTag}>
          {timespan(todayKey, bag.day, 'y', locale)}
        </Tag>
        {/* The Chinese lunar (Nong Li) date under the countdown; phones keep their one extra tag for date markers. */}
        {lunar ? (
          <Tag variant="countdown" title={lunar.title} href={triviaSearchUrl(lunar.query, locale)} className={`${extraTag} max-sm:hidden`}>
            <span lang="zh-CN">{lunar.text}</span>
          </Tag>
        ) : null}
        {/* On phones only the first extra tag fits beside the date and countdown; the rest show from sm up. */}
        {bag.dateTimes.map((dt, i) => (
          <Tag key={dt.id} variant="trivia" wrap title={dt.description || dt.title} href={triviaSearchUrl(dt.title, locale)} className={`${extraTag} ${i > 0 ? 'max-sm:hidden' : ''}`}>
            {dt.title}
          </Tag>
        ))}
        {specialtyDays.length ? <SpecialtyTag names={specialtyDays} className={bag.dateTimes.length ? 'max-sm:hidden' : ''} /> : null}
      </div>

      {bag.pins.length ? (
        <>
          <PinColumns tagsHeight={tagsHeight}>
            {shown.map(({ stack, rank }, i) => (
              <DayCard
                key={stack.pin.id}
                stack={stack}
                order={i}
                anchor
                counted={sample}
                className={rank >= BAG_LIMIT_PHONE ? 'max-sm:hidden' : ''}
                serverTimeZone={serverTimeZone}
                priority={firstPinPriority && i === firstShown}
              />
            ))}
          </PinColumns>
          {sample && morePhone && daySearchHref ? <ShowMore href={daySearchHref(bag.day)} total={stacks.length + unloaded} hiddenWide={moreWide > 0} /> : null}
        </>
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
              <a href={triviaSearchUrl(dt.title, locale)} target="_blank" rel="noopener nofollow" className="font-semibold text-muted hover:text-link">
                {dt.title}
              </a>
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

// One card of a day, stacked over its duplicates if it has any. Only the
// timeline's copy is the `pin-<id>` anchor that jumps and return spots find.
// `counted` cards are impressions: the timeline's, not search results (asked
// for).
function DayCard({
  stack: { pin, hidden },
  order,
  anchor = false,
  counted = false,
  className = '',
  serverTimeZone,
  priority,
}: {
  stack: PinStack<PinJson>;
  order: number;
  anchor?: boolean;
  counted?: boolean;
  className?: string;
  serverTimeZone: string;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useImpression(ref, pin.id, counted);
  const card = <PinCard pin={pin} serverTimeZone={serverTimeZone} priority={priority} />;
  return (
    <div ref={ref} id={anchor ? `pin-${pin.id}` : undefined} data-start={pin.utcStartDateTime} role="listitem" className={`mb-2.5 ${className}`} style={{ order }}>
      {hidden.length ? (
        <DuplicateStack pin={pin} hiddenCount={hidden.length}>
          {card}
        </DuplicateStack>
      ) : (
        card
      )}
    </div>
  );
}

// Below a day cut to two rows: "View all 71 pins", the whole day as a date:
// search. Two rows are four cards from sm up and two on phones, so from sm up
// there may be none left out (hiddenWide false), and then it shows on phones
// only.
function ShowMore({ href, total, hiddenWide }: { href: string; total: number; hiddenWide: boolean }) {
  const t = useT();
  return (
    <div className={`mb-2.5 flex justify-center lg:ml-[170px] lg:max-w-[906px] ${hiddenWide ? '' : 'sm:hidden'}`}>
      <Link href={href} className="rounded-full px-3 py-1 text-sm font-medium text-subtle tabular-nums ring-1 ring-line ring-inset hover:text-link hover:no-underline">
        {t('timeline.viewAll', { count: total })}
      </Link>
    </div>
  );
}

// A card with its day's duplicates stacked behind it: the edges of two cards
// peek out below, and a link leads to the pin page's list of them.
function DuplicateStack({ pin, hiddenCount, children }: { pin: PinJson; hiddenCount: number; children: React.ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="relative pb-3">
        <div aria-hidden className="absolute inset-x-4 bottom-0 h-8 rounded-b-xl border border-line bg-raised-2" />
        <div aria-hidden className="absolute inset-x-2 bottom-1.5 h-8 rounded-b-xl border border-line bg-raised" />
        <div className="relative">{children}</div>
      </div>
      <Link href={`${pinPath(pin)}#duplicates`} className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-subtle hover:text-link hover:no-underline">
        <span className="rounded-full bg-raised px-1.5 tabular-nums ring-1 ring-line ring-inset">+{hiddenCount}</span>
        {t('timeline.morePinsOfThis', { count: hiddenCount })}
      </Link>
    </div>
  );
}

// The day's first specialty day ("National Peanut Day"); the title lists them
// all. Wraps to three lines, so it ends the stack.
export function SpecialtyTag({ names, className = '' }: { names: string[]; className?: string }) {
  const locale = useLocale();
  return (
    <a
      href={triviaSearchUrl(names[0], locale)}
      target="_blank"
      rel="noopener nofollow"
      className={`${tagBase} tag-trivia ${extraTag} lg:text-xs lg:leading-4 ${className}`}
      title={names.join('\n')}
    >
      <span className="block truncate lg:line-clamp-3 lg:whitespace-normal">{names[0]}</span>
    </a>
  );
}

export function TodayMarker({ specialtyDays }: { specialtyDays: string[] }) {
  const t = useT();
  return (
    <div className="relative mt-2.5 pt-10 max-lg:mt-6 lg:min-h-[36px] lg:pt-0">
      <div className="today-dot absolute top-[7px] left-[140px] z-10 -ml-[7px] hidden size-3.5 rounded-full lg:block" />
      <div className={tagRow}>
        <div id="today-marker" className={`${tagBase} ${leadTag} tag-today tag-link uppercase tracking-wider lg:text-xs`} style={{ ['--tag-reach' as string]: '23px' }}>
          {t('controls.today')}
        </div>
        {specialtyDays.length ? <SpecialtyTag names={specialtyDays} /> : null}
      </div>
      {specialtyDays.length ? <div className="hidden lg:block lg:h-[60px]" /> : null}
    </div>
  );
}
