'use client';

import Link from '@/components/ui/Link';
import { Fragment, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { BAG_LIMIT, BAG_LIMIT_PHONE, marketCapWeight, sampleBag } from '@/lib/bagSample';
import { useDayNews } from '@/lib/client/dayNews';
import { leaveTimelineForDay } from '@/lib/client/dayReturn';
import { useImpression } from '@/lib/client/impressions';
import { stackDuplicates, type PinStack } from '@/lib/duplicates';
import { formatDayKey, lunarDate, moonPhase, timespan, weekdayPlanet } from '@/lib/format';
import { pinPath } from '@/lib/seo';
import type { Bag } from '@/lib/timeline';
import type { PinJson } from '@/lib/types';
import type { personalWeigher } from '@/lib/userWiki';
import { PinCard } from '@/components/pin/PinCard';
import { useLeftOut } from '@/lib/client/leftOut';
import { useLocale, useT } from '@/lib/client/i18n';
import type { SpecialtyDay } from '@/lib/specialtyDays';
import { holidayForMarker, isAstronomyMarker, type CulturalDay } from '@/lib/culturalDays';
import { markerLabel } from '@/lib/i18n/labels';

// Beside the rail (lg) tags are a fixed-width column; above the cards on
// narrow screens they share one row, extra tags (date markers, specialty days)
// shrinking into what the date and countdown leave so the date is never cut short.
const tagBase = 'tag lg:w-full';
const leadTag = 'shrink-0';
const extraTag = 'min-w-0 sm:max-lg:shrink-0';
const tagRow = 'absolute top-0 end-0 start-0 flex gap-1.5 overflow-hidden max-lg:overflow-x-auto max-lg:[scrollbar-width:none] lg:end-auto lg:w-[110px] lg:flex-col lg:overflow-visible';

// The columns a day grows past its second, in the order the window brings
// them in: the class that puts the column on screen, how many tracks the day
// then has, how wide its cards may spread (n x 448 plus their gaps), and the
// class that takes "View all" away once that width leaves nothing out (and
// the same width as a media query, for a whole day dealt in script). A
// width arrives once each of its cards can be 384px (see globals.css), and
// Tailwind only sees classes written out whole, so they are.
const WIDE_COLUMNS = [
  { column: '3xl:flex', tracks: '3xl:grid-cols-3', row: '3xl:max-w-[1364px]', hide: '3xl:hidden', query: '(width >= 104rem)' },
  { column: '4xl:flex', tracks: '4xl:grid-cols-4', row: '4xl:max-w-[1822px]', hide: '4xl:hidden', query: '(width >= 129rem)' },
  { column: '5xl:flex', tracks: '5xl:grid-cols-5', row: '5xl:max-w-[2280px]', hide: '5xl:hidden', query: '(width >= 154rem)' },
  { column: '6xl:flex', tracks: '6xl:grid-cols-6', row: '6xl:max-w-[2738px]', hide: '6xl:hidden', query: '(width >= 178rem)' },
];
// Two rows of the widest ladder: what a day is picked for, however wide the
// window is now (src/lib/bagSample.ts).
const BAG_LIMIT_WIDE = BAG_LIMIT + 2 * WIDE_COLUMNS.length;
// A day is a grid of tracks the window decides, not columns that divide the
// day between them: a quiet day leaves its later tracks empty rather than
// spreading into them, so a card is the same width on every date of the
// timeline. Below sm the columns dissolve (display: contents) and the cards
// become the single column's own rows; the first two say their part again
// with sm: prefixes, and Tailwind reads the classes as written, never
// assembled.
const cardColumn = 'min-w-0 flex-col';
const firstColumn = 'contents sm:flex sm:min-w-0 sm:flex-col';
const rowTracks = `grid grid-cols-1 sm:grid-cols-2 sm:gap-x-2.5 ${WIDE_COLUMNS.map((c) => c.tracks).join(' ')}`;
// How far a day may spread at each width, which is what holds a track to at
// most one card's 448px; the "View all" link under the cards takes it too, to stay
// centred on them.
export const rowWidth = `sm:max-w-[906px] ${WIDE_COLUMNS.map((c) => c.row).join(' ')}`;

type TagVariant = 'date' | 'countdown' | 'today' | 'trivia' | 'holiday' | 'tradition';

// A day's markers are trivia the site holds no pin for, so the chip hands the
// name to a web search in the viewer's language.
function triviaSearchUrl(name: string, locale: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}&hl=${locale}`;
}

// How many lines a name takes in the 110px tag column, worked out by wrapping
// it word by word (a CJK character counts double, and a word too long for a line
// breaks anywhere): at least `min`, at most five. Tailwind needs the clamp
// classes whole.
type TagLines = 2 | 3 | 4 | 5;
const LINE_CLAMP: Record<TagLines, string> = { 2: 'lg:line-clamp-2', 3: 'lg:line-clamp-3', 4: 'lg:line-clamp-4', 5: 'lg:line-clamp-5' };
const LINE_UNITS = 12;
const textUnits = (text: string) => [...text].reduce((sum, ch) => sum + (/[\u1100-\u11ff\u2e80-\ud7ff\uf900-\ufaff\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
function tagLines(label: string, min: TagLines = 2): TagLines {
  let lines = 1;
  let used = 0;
  for (const word of label.split(/\s+/).filter(Boolean)) {
    const width = textUnits(word);
    if (used && used + 1 + width <= LINE_UNITS) used += 1 + width;
    else {
      if (used) lines++;
      used = width;
    }
    while (used > LINE_UNITS) {
      lines++;
      used -= LINE_UNITS;
    }
  }
  return Math.min(5, Math.max(min, lines)) as TagLines;
}
// A tag of n lines is 26px of padding and gap plus 14 a line (a date marker's
// two lines are 54, the specialty day's three 68).
const tagHeight = (lines: number) => 26 + 14 * lines;

// Beside the rail, a `wrap` tag wraps evenly to two lines (the 54px a date
// marker is allowed) instead of cutting off, in the same type as the rest; a
// long name (`lines`, from tagLines) may take up to five.
// With an `href` the chip is that search link, opened in a new tab.
function Tag({ variant, children, title, className = '', wrap = false, lines = 2, href, holiday }: { variant: TagVariant; children: React.ReactNode; title?: string; className?: string; wrap?: boolean; lines?: TagLines; href?: string; holiday?: number | 's' }) {
  const chip = `${tagBase} tag-${variant} ${className}`;
  const label = <span className={`block truncate ${wrap ? `${LINE_CLAMP[lines]} lg:whitespace-normal lg:text-balance` : ''}`}>{children}</span>;
  return href ? (
    <a href={href} target="_blank" rel="noopener nofollow" className={chip} title={title} data-tradition={holiday}>
      {label}
    </a>
  ) : (
    <div className={chip} title={title} data-tradition={holiday}>
      {label}
    </div>
  );
}

function stackIds(stacks: PinStack<PinJson>[], id: number): number[] {
  const stack = stacks.find((s) => s.pin.id === id);
  return stack ? [id, ...stack.hidden.map((h) => h.id)] : [id];
}

// What a day's date markers come to once the cultural holidays are in: the
// astronomy ones stay trivia, and the holidays (a US federal one, Pentecost)
// become holiday tags - except a marker the catalog also has a tag for, which
// gives way to it (the catalog's carries the day's foods and customs).
function splitMarkers<T extends { title: string }>(dateTimes: T[], culturalDays: CulturalDay[]) {
  const catalog = new Set(culturalDays.map((d) => d.id));
  const left = dateTimes.filter((dt) => {
    const id = holidayForMarker(dt.title);
    return !(id && catalog.has(id));
  });
  return { astronomy: left.filter((dt) => isAstronomyMarker(dt.title)), national: left.filter((dt) => !isAstronomyMarker(dt.title)) };
}

// A holiday's name takes two lines in the column, more (to five) when it is long.
const holidayLines = (label: string): TagLines => tagLines(label, 2);
// The specialty day's name takes three at least, to five.
const specialtyLines = (days: SpecialtyDay[]): TagLines => tagLines(days[0].label, 3);
const specialtyHeight = (days: SpecialtyDay[]) =>
  days.length ? tagHeight(specialtyLines(days)) + (days[0].traditions ?? []).reduce((sum, tradition) => sum + tagHeight(tagLines(tradition.label, 2)), 0) : 0;

// How tall the holiday tags are stacked beside the rail (lg): each is up to
// two lines, 54px with its gap, a long holiday or tradition name more.
const holidayStackHeight = (national: number, culturalDays: CulturalDay[]) =>
  54 * national +
  culturalDays.reduce(
    (sum, d) => sum + tagHeight(holidayLines(d.label)) + d.traditions.reduce((tSum, tradition) => tSum + tagHeight(tagLines(tradition.label, 2)), 0),
    0,
  );

// One calendar day on the timeline: its tags (date, countdown, date markers,
// specialty day, holidays) beside or above its cards.
export function TimeBlock({
  id,
  bag,
  todayKey,
  specialtyDays,
  culturalDays = [],
  serverTimeZone,
  firstPinPriority,
  sample = false,
  focusId,
  daySearchHref,
  dayTotal,
  boost,
  adRow,
}: {
  // Defaults to the day's id, which is only unique in date order.
  id?: string;
  bag: Bag;
  todayKey: string;
  specialtyDays: SpecialtyDay[];
  // The day's national and cultural holidays with their traditions, in a colour of their own, above the specialty day.
  culturalDays?: CulturalDay[];
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
  // An ad row after this day, inside its section so the sticky tag column's
  // reach (bound to the section's box) covers it too: the label rides until
  // the next day's takes over instead of letting go early and leaving a gap
  // over the ad's own margin.
  adRow?: React.ReactNode;
}) {
  const t = useT();
  const { locale } = t;
  const stacks = stackDuplicates(bag.pins);
  // Seeded by today and the day: the pick holds through hydration and the
  // day's reloads, and turns over each day.
  const keep = focusId == null ? null : (stacks.find((s) => s.pin.id === focusId || s.hidden.some((h) => h.id === focusId))?.pin.id ?? null);
  // A card stands for its whole stack: opening any duplicate counts for it.
  const weigh = boost && ((pin: PinJson) => boost(pin, stackIds(stacks, pin.id)));
  const picked = sample && stacks.length > BAG_LIMIT_PHONE ? sampleBag(stacks.map((s) => s.pin), BAG_LIMIT_WIDE, `${todayKey}:${bag.day}`, keep, weigh) : null;
  // The picked cards in date order, each with where it fell in the pick: two
  // of them fill each column the window has room for, in that order. What is
  // left over is not drawn on the timeline at all, only on the day's search.
  const shown = stacks.map((stack) => ({ stack, rank: picked ? picked.indexOf(stack.pin.id) : 0 })).filter((s) => s.rank >= 0);
  // Pins of the day not loaded yet count as more, too (duplicates among them
  // cannot be told apart without loading them).
  const unloaded = Math.max(0, (dayTotal ?? 0) - bag.pins.length);
  // What "View all" would still add to a day of this many columns.
  const leftOut = (columns: number) => stacks.length + unloaded - Math.min(shown.length, 2 * columns);
  // The link goes at the first width wide enough to leave nothing out.
  const hiddenFrom = leftOut(2) === 0 ? 'sm:hidden' : (WIDE_COLUMNS.find((_, i) => leftOut(3 + i) === 0)?.hide ?? '');
  // Pins the day gained since this browser last saw it, for the "View all"
  // pill's badge. Counted raw (duplicates too), which reads the same whether
  // the day is loaded whole or only counted.
  const sectionRef = useRef<HTMLElement>(null);
  const fresh = useDayNews(sectionRef, bag.day, Math.max(dayTotal ?? 0, bag.pins.length), !!sample);
  const firstShown = shown.findIndex((s) => s.rank < BAG_LIMIT_PHONE);
  const isToday = bag.day === todayKey;
  const planet = weekdayPlanet(bag.day, locale);
  const moon = moonPhase(bag.day, 16, locale);
  const lunar = lunarDate(bag.day, locale);
  const { astronomy, national } = splitMarkers(bag.dateTimes, culturalDays);
  // 42px a one-line tag, 54 a date marker's two lines and 68 to 96 the specialty
  // day's three to five; the holidays' tags come last.
  const tagsHeight = 26 + 42 * (2 + (lunar ? 1 : 0)) + 54 * astronomy.length + specialtyHeight(specialtyDays) + holidayStackHeight(national.length, culturalDays);
  // On phones only one extra tag fits beside the date and countdown: the
  // day's holiday if it has one, else its first marker, else its specialty day.
  const phoneTag = culturalDays.length ? `c:${culturalDays[0].id}` : national.length ? `m:${national[0].id}` : astronomy.length ? `m:${astronomy[0].id}` : 'specialty';
  const tagRowRef = useFitTraditions([culturalDays, locale, bag.day, isToday]);
  const hideOnPhone = (key: string) => (key === phoneTag ? '' : 'max-sm:hidden');
  // Every card the day may show, in date order; which columns they fall into
  // is PinColumns' business, and how narrow a window still shows one is its
  // place in the pick.
  const cards = shown.map(({ stack, rank }, i) => (
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
  ));

  return (
    <section ref={sectionRef} id={id ?? `day-${bag.day}`} data-day={bag.day} aria-label={formatDayKey(bag.day, locale)} className="relative mt-2.5 max-lg:mt-6" style={{ ['--tags-h' as string]: `${tagsHeight}px` }}>
      {/* The day's rail rides under the navbar while the day scrolls by, and
          the next day's pushes it off: sticky inside its own section. Beside
          the rail (lg) it is the tag column, as tall as its tags, with the
          cards pulled up beside it; on narrow screens a page-coloured strip
          the cards pass under. Its -mt-2 collapses into the section's margin,
          so the tags sit where the old 40px of padding put them. A pill pinned
          above it (the day search's "Back to timeline") sets --rail-drop: the
          rail sticks that much lower, the phone strip's page colour reaching
          back up behind the pill. */}
      <div className="sticky top-[calc(52px+var(--rail-drop,0px))] z-20 max-lg:-mt-2 max-lg:h-12 max-lg:bg-page max-lg:before:absolute max-lg:before:inset-x-0 max-lg:before:bottom-full max-lg:before:h-[var(--rail-drop,0px)] max-lg:before:bg-page lg:h-(--tags-h) lg:w-[170px]">
        <div
          className={`rail-marker absolute top-6 cursor-default start-[140px] z-10 -ms-4 hidden size-8 items-center justify-center overflow-hidden rounded-full text-base leading-none lg:flex ${isToday ? 'rail-marker-today' : ''}`}
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

        <div ref={tagRowRef} className={`${tagRow} max-lg:top-2 lg:top-[26px]`}>
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
          {/* Astronomy markers, then the holidays (a different colour), and the specialty day with its customs at the bottom of the stack. On phones only one extra tag fits beside the date and countdown; the rest show from sm up. */}
          {astronomy.map((dt) => (
            <Tag key={dt.id} variant="trivia" wrap title={dt.description || markerLabel(t, dt.title)} href={triviaSearchUrl(markerLabel(t, dt.title), locale)} className={`${extraTag} ${hideOnPhone(`m:${dt.id}`)}`}>
              {markerLabel(t, dt.title)}
            </Tag>
          ))}
          {national.map((dt) => (
            <Tag key={dt.id} variant="holiday" wrap title={dt.description || markerLabel(t, dt.title)} href={triviaSearchUrl(markerLabel(t, dt.title), locale)} className={`${extraTag} ${hideOnPhone(`m:${dt.id}`)}`}>
              {markerLabel(t, dt.title)}
            </Tag>
          ))}
          <HolidayTags days={culturalDays} phoneTag={phoneTag} />
          {specialtyDays.length ? <SpecialtyTag days={specialtyDays} className={hideOnPhone('specialty')} /> : null}
          <SpecialtyTraditions days={specialtyDays} />
        </div>
      </div>

      {bag.pins.length ? (
        <>
          <PinColumns cards={cards} ranks={shown.map((s) => s.rank)} lift={shown.map((s) => marketCapWeight(s.stack.pin.companyMarketCap))} whole={!sample} />
          {sample && leftOut(1) > 0 && daySearchHref ? (
            <ShowMore href={daySearchHref(bag.day)} total={stacks.length + unloaded} fresh={fresh} hiddenFrom={hiddenFrom} />
          ) : null}
        </>
      ) : (
        // lg:pt-7 lines the first title up with the date tag and rail marker
        // (tags start 26px down; a 24px line centred on the 28px-tall tag).
        // The tag column's height is only reserved beside the rail; on narrow
        // screens the tags are one row above, so the day is just its titles.
        <ul className="lg:ms-[170px] lg:-mt-(--tags-h) lg:min-h-[max(120px,var(--tags-h))] lg:pt-7">
          {bag.dateTimes.map((dt) => (
            <li key={dt.id} className="pb-px">
              <a href={triviaSearchUrl(markerLabel(t, dt.title), locale)} target="_blank" rel="noopener nofollow" className="font-semibold text-muted hover:text-link">
                {markerLabel(t, dt.title)}
              </a>
              {dt.description ? <div className="mb-2 text-subtle">{dt.description}</div> : null}
            </li>
          ))}
        </ul>
      )}
      {adRow}
    </section>
  );
}

// The day's first four cards fill across before down: from sm up they
// alternate between two columns (1 left, 2 right, 3 left...), each column
// stacking its own cards without gaps. On phones the columns dissolve
// (display: contents) into one list, and each card's `order` puts it back in
// date order. Every column after those two is the next two of the pick and
// waits for a window wide enough (WIDE_COLUMNS), so a card keeps its column
// as the window grows: widening only ever adds a column on the right. A day
// short of cards for a column simply leaves that track empty.
//
// A `whole` day (a date: search, every pin of it) has no pick to rank by, so
// its cards are dealt across every track the window has, in date order, the
// same fill-across-then-down the timeline's first four get.
//
// Within those first four, a large-cap company's card (`lift`, its market-cap
// weight) goes ahead of the date order, biggest first: top-left is the biggest
// name. Phones keep date order through each card's `order`.
function PinColumns({ cards, ranks, lift, whole }: { cards: React.ReactElement[]; ranks: number[]; lift: number[]; whole: boolean }) {
  const tracks = useDayTracks(whole);
  const byRank = (from: number, to: number) => cards.filter((_, i) => ranks[i] >= from && ranks[i] < to);
  const first = whole ? cards : cards.map((c, i) => ({ c, i })).filter(({ i }) => ranks[i] >= 0 && ranks[i] < BAG_LIMIT).sort((a, b) => lift[b.i] - lift[a.i]).map(({ c }) => c);
  const perTrack = whole ? tracks : 2;
  const wide = (i: number) => (whole ? (2 + i < tracks ? cards.filter((_, c) => c % tracks === 2 + i) : []) : byRank(BAG_LIMIT + 2 * i, BAG_LIMIT + 2 * i + 2));
  return (
    <div role="list" className={`${rowTracks} lg:ms-[170px] lg:-mt-(--tags-h) lg:min-h-(--tags-h) ${rowWidth}`}>
      {[0, 1].map((parity) => (
        <div key={parity} className={firstColumn}>
          {first.filter((_, i) => i % perTrack === parity)}
        </div>
      ))}
      {WIDE_COLUMNS.map(({ column }, i) => {
        const held = wide(i);
        return held.length ? (
          <div key={column} className={`hidden ${cardColumn} ${column}`}>
            {held}
          </div>
        ) : null;
      })}
    </div>
  );
}

function subscribeTracks(listener: () => void) {
  const queries = WIDE_COLUMNS.map(({ query }) => window.matchMedia(query));
  for (const query of queries) query.addEventListener('change', listener);
  return () => {
    for (const query of queries) query.removeEventListener('change', listener);
  };
}

const noSubscribe = () => () => {};
const twoTracks = () => 2;
const readTracks = () => 2 + WIDE_COLUMNS.filter(({ query }) => window.matchMedia(query).matches).length;

// How many tracks a day has at this window width (2 from sm up to 3xl; below
// sm the two dissolve into one list anyway). The server cannot know the
// window, so it deals a whole day into two and the rest follow on hydration;
// a sampled day places its cards by rank and never asks.
function useDayTracks(whole: boolean) {
  return useSyncExternalStore(whole ? subscribeTracks : noSubscribe, whole ? readTracks : twoTracks, twoTracks);
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
  // By someone the reader blocked, or a pin they are not interested in.
  const leftOut = useLeftOut()(pin);
  if (leftOut) return null;
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
// search, with "3 new" when the day gained pins since this browser last saw
// it (useDayNews). Two rows are two cards a column, so a wide enough window
// may leave nothing out; `hiddenFrom` is the width where that happens and the
// link goes.
function ShowMore({ href, total, fresh, hiddenFrom }: { href: string; total: number; fresh: number; hiddenFrom: string }) {
  const t = useT();
  return (
    <div className={`mb-2.5 flex justify-center lg:ms-[170px] ${rowWidth} ${hiddenFrom}`}>
      <Link
        href={href}
        // Marks the trip, so the day's search offers the way back to this spot.
        onClick={() => leaveTimelineForDay(href)}
        className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-subtle tabular-nums ring-1 ring-line ring-inset transition-colors hover:bg-raised hover:text-link hover:no-underline active:bg-raised-2"
      >
        {t('timeline.viewAll', { count: total })}
        {fresh > 0 ? <span className="rounded-full bg-accent px-1.5 text-xs leading-5 font-bold text-white">{t('timeline.newPins', { count: fresh })}</span> : null}
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

// The hue of the day's nth holiday (the .holiday-hue-n classes; violet is the
// tags' own colour, so it needs none), red last.
const HOLIDAY_HUES = ['holiday-hue-1', 'holiday-hue-2', '', 'holiday-hue-3', 'holiday-hue-4', 'holiday-hue-5', 'holiday-hue-6'];
const holidayHue = (i: number) => HOLIDAY_HUES[i % HOLIDAY_HUES.length];

// Between sm and lg the day's tags share one row at their full width, and the
// traditions take what room the others leave, an even share for each holiday
// from the first one on (the specialty day's customs only after all of them): each holiday's first tradition, then each one's
// second, and so on, a tradition that doesn't fit whole left out (data-off, which
// hides it below lg) along with its holiday's later ones.
function useFitTraditions(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const fit = () => {
      const all = Array.from(row.querySelectorAll<HTMLElement>('[data-tradition]')).filter((el) => el.classList.contains('tag-tradition'));
      all.forEach((el) => el.removeAttribute('data-off'));
      if (!all.length || window.innerWidth < 640 || window.innerWidth >= 1024) return;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const base = Array.from(row.children).filter((el) => !all.includes(el as HTMLElement) && (el as HTMLElement).offsetWidth > 0);
      let used = base.reduce((sum, el) => sum + (el as HTMLElement).offsetWidth, 0) + gap * Math.max(base.length - 1, 0);
      const byDay = new Map<string, HTMLElement[]>();
      for (const el of all) byDay.set(el.dataset.tradition!, [...(byDay.get(el.dataset.tradition!) ?? []), el]);
      // The specialty day's customs ('s') take only what the holidays' leave.
      const queueOf = (entries: [string, HTMLElement[]][]) => entries.sort((x, y) => Number(x[0]) - Number(y[0])).map(([, els]) => els);
      const holidayQueues = queueOf(Array.from(byDay.entries()).filter(([key]) => key !== 's'));
      const kept = new Set<HTMLElement>();
      for (const queues of [holidayQueues, byDay.has('s') ? [byDay.get('s')!] : []]) {
        for (let round = 0, grew = true; grew; round++) {
          grew = false;
          for (const els of queues) {
            const el = els[round];
            if (!el || (round && !kept.has(els[round - 1]))) continue;
            grew = true;
            if (used + gap + el.offsetWidth <= row.clientWidth) {
              used += gap + el.offsetWidth;
              kept.add(el);
            }
          }
        }
      }
      all.forEach((el) => (kept.has(el) ? el.removeAttribute('data-off') : el.setAttribute('data-off', '')));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// On phones every holiday of the day shows (the first shrinks to fit, the rest
// keep their width and run on past the row's end, which scrolls sideways); the
// traditions wait for sm.
// The day's cultural holidays ("Mid-Autumn Festival"), each followed by the
// foods and customs people keep that day ("Mooncakes", "Lantern lighting"):
// one tag apiece, in the holiday's own colour, searching the web for it in the
// page's language. Wrapped to two lines like the date markers.
export function HolidayTags({ days, phoneTag }: { days: CulturalDay[]; phoneTag?: string }) {
  const locale = useLocale();
  return (
    <>
      {days.map((day, i) => {
        const hue = holidayHue(i);
        return (
          <Fragment key={day.id}>
            <Tag variant="holiday" wrap lines={holidayLines(day.label)} title={day.label} href={triviaSearchUrl(day.name, locale)} className={`${extraTag} ${hue} ${i ? 'max-sm:shrink-0' : ''} ${phoneTag == null || phoneTag.startsWith('c:') ? '' : 'max-sm:hidden'}`}>
              {day.label}
            </Tag>
            {day.traditions.map((tradition) => (
              <Tag key={tradition.name} variant="tradition" wrap lines={tagLines(tradition.label, 2)} holiday={i} title={`${day.label}: ${tradition.label}`} href={triviaSearchUrl(`${day.name} ${tradition.name}`, locale)} className={`${extraTag} ${hue} max-sm:hidden max-lg:data-[off]:hidden`}>
                {tradition.label}
              </Tag>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}

// The day's first specialty day ("National Peanut Day"), in the page's
// language; the title lists them all. It searches for the English name, the
// one the web knows it by. In the tags' own type, wrapped evenly (全国幸福 /
// 青鸟日, not a lone last character) to as many as five lines, so it ends the stack.
export function SpecialtyTag({ days, className = '' }: { days: SpecialtyDay[]; className?: string }) {
  const locale = useLocale();
  return (
    <a
      href={triviaSearchUrl(days[0].name, locale)}
      target="_blank"
      rel="noopener nofollow"
      className={`${tagBase} tag-trivia ${extraTag} ${className}`}
      title={days.map((day) => day.label).join('\n')}
    >
      <span className={`block truncate ${LINE_CLAMP[specialtyLines(days)]} lg:whitespace-normal lg:text-balance`}>{days[0].label}</span>
    </a>
  );
}

// The customs of the day's first specialty day ("Baking pies"), under its tag in
// the same blue, lighter; each searches the web for the day with the custom.
export function SpecialtyTraditions({ days }: { days: SpecialtyDay[] }) {
  const locale = useLocale();
  const day = days[0];
  if (!day?.traditions?.length) return null;
  return (
    <>
      {day.traditions.map((tradition) => (
        <Tag key={tradition.name} variant="tradition" wrap lines={tagLines(tradition.label, 2)} holiday="s" title={`${day.label}: ${tradition.label}`} href={triviaSearchUrl(`${day.name} ${tradition.name}`, locale)} className={`${extraTag} tag-specialty-tradition max-sm:hidden max-lg:data-[off]:hidden`}>
          {tradition.label}
        </Tag>
      ))}
    </>
  );
}

// `day` is today's key: the day the URL's hash names while it is at the top.
export function TodayMarker({ day, specialtyDays, culturalDays = [] }: { day: string; specialtyDays: SpecialtyDay[]; culturalDays?: CulturalDay[] }) {
  const t = useT();
  const tagRowRef = useFitTraditions([culturalDays, t]);
  return (
    <div data-day={day} className="relative mt-2.5 pt-10 max-lg:mt-6 lg:min-h-[36px] lg:pt-0">
      <div className="today-dot absolute top-[7px] start-[140px] z-10 -ms-[7px] hidden size-3.5 rounded-full lg:block" />
      <div ref={tagRowRef} className={tagRow}>
        <div id="today-marker" className={`${tagBase} ${leadTag} tag-today tag-link uppercase tracking-wider lg:text-xs`} style={{ ['--tag-reach' as string]: '23px' }}>
          {t('controls.today')}
        </div>
        <HolidayTags days={culturalDays} />
        {specialtyDays.length ? <SpecialtyTag days={specialtyDays} /> : null}
        <SpecialtyTraditions days={specialtyDays} />
      </div>
      {specialtyDays.length || culturalDays.length ? <div className="hidden lg:block" style={{ height: (specialtyDays.length ? specialtyHeight(specialtyDays) + 4 : 0) + holidayStackHeight(0, culturalDays) }} /> : null}
    </div>
  );
}
