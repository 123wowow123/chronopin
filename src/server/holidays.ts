// Holidays and special days by name, for holiday: search terms and the search
// box's suggestions: the cultural holidays of the timeline's date tags
// (src/lib/culturalDays.ts, moving dates worked out per year) and its
// specialty days ("National Peanut Day", the same date every year). A name is
// the English one the tag searches for; the suggestions also match the page's
// language. The solstices, equinoxes, aphelion and perihelion are the
// timeline's DateTime markers: exact instants, so their day is the viewer's.

import type { Locale } from '@/lib/i18n/config';
import { dayKeyIn } from '@/lib/format';
import * as db from './db';
import { HOLIDAYS, type HolidayDef } from '@/lib/culturalDays';
import { FIRST_YEAR, holidayLabel, LAST_YEAR, occurrenceIn, occurrencesOf } from './culturalDays';
import { specialtyDayNames } from './specialtyDays';

// A run of days ("2026-10-31" to "2026-10-31"), both ends in.
export type DayRange = { from: string; to: string };

// Most names a search resolves, so a long list of terms cannot grow the query without end.
const MAX_NAMES = 6;

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const lower = (text: string) => text.trim().toLowerCase();

function catalogHoliday(name: string): HolidayDef | undefined {
  const wanted = lower(name);
  return HOLIDAYS.find((def) => lower(def.name) === wanted || def.id === wanted || def.aliases?.some((alias) => lower(alias) === wanted));
}

// Each year's run of the holiday's days, in every year the catalog is worked out for.
function holidayRuns(def: HolidayDef): DayRange[] {
  return occurrencesOf(def).map((o) => ({ from: o.start, to: o.end }));
}

// Every year's day of a special day that keeps one date ("02-29" only in leap years).
function specialRuns(monthDays: string[]): DayRange[] {
  const runs: DayRange[] = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    for (const monthDay of monthDays) {
      if (monthDay === '02-29' && !isLeap(year)) continue;
      runs.push({ from: `${year}-${monthDay}`, to: `${year}-${monthDay}` });
    }
  }
  return runs;
}

// The astronomy markers by the English name a search writes ("Spring
// Equinox"), the titles the "DateTime" table calls them by, and other names for
// them. "Solstice" and "Equinox" alone are both of theirs.
const ASTRONOMY = [
  { name: 'Spring Equinox', titles: ['Spring Equinoxes'], aliases: ['March Equinox', 'Vernal Equinox'] },
  { name: 'Summer Solstice', titles: ['Summer Solstice'], aliases: ['June Solstice'] },
  { name: 'Fall Equinox', titles: ['Fall Equinoxes'], aliases: ['Autumn Equinox', 'September Equinox'] },
  { name: 'Winter Solstice', titles: ['Winter Solstice'], aliases: ['December Solstice'] },
  { name: 'Aphelion', titles: ['Aphelion'], aliases: [] },
  { name: 'Perihelion', titles: ['Perihelion'], aliases: [] },
];

// The "DateTime" titles a holiday: name stands for, none when it is not an astronomy marker.
export function astronomyTitles(name: string): string[] {
  const wanted = lower(name);
  return ASTRONOMY.filter((a) => lower(a.name) === wanted || lower(a.name).endsWith(` ${wanted}`) || a.aliases.some((alias) => lower(alias) === wanted)).flatMap((a) => a.titles);
}

// Each marker's instants (ms), read once: they are seed data that never changes.
let instants: Map<string, number[]> | undefined;
export async function loadAstronomy(): Promise<void> {
  if (instants) return;
  const rows = await db.query(
    `SELECT "title", "utcStartDateTime" FROM "DateTime" WHERE "title" = ANY($1::text[]) ORDER BY "utcStartDateTime"`,
    [ASTRONOMY.flatMap((a) => a.titles)],
  );
  const found = new Map<string, number[]>();
  for (const row of rows) found.set(row.title, [...(found.get(row.title) ?? []), new Date(row.utcStartDateTime).getTime()]);
  instants = found;
}

// The days (in the viewer's zone) the markers of these titles fall on.
function astronomyRuns(titles: string[], zone: string): DayRange[] {
  const days = new Set(titles.flatMap((title) => (instants?.get(title) ?? []).map((ms) => dayKeyIn(ms, zone))));
  return [...days].sort().map((day) => ({ from: day, to: day }));
}

let specialNames: Map<string, string[]> | undefined;
const specialByName = () => (specialNames ??= new Map(specialtyDayNames('en').map((day) => [lower(day.name), day.monthDays])));

// The days the named holidays fall on, as runs, or none for a name nobody
// keeps. The astronomy markers' days are the zone's, and need loadAstronomy first.
export function holidayRanges(names: string[], zone = 'UTC'): DayRange[] {
  const special = specialByName();
  return names.slice(0, MAX_NAMES).flatMap((name) => {
    const def = catalogHoliday(name);
    if (def) return holidayRuns(def);
    const titles = astronomyTitles(name);
    if (titles.length) return astronomyRuns(titles, zone);
    const monthDays = special.get(lower(name));
    return monthDays ? specialRuns(monthDays) : [];
  });
}

export type HolidaySuggestion = {
  // The English name, which holiday: searches for.
  name: string;
  // The name in the page's language.
  label: string;
  kind: 'holiday' | 'special' | 'astronomy';
  // Its next day on or after today ("2026-10-31"), when it has one.
  next: string | null;
};

// Where the typed text stands in a name: 0 when it begins the name, 1 when it
// begins a later word of it (hyphens and apostrophes part words), 2 when it is
// anywhere in it (Chinese, Japanese, Korean and Thai write no spaces), or
// none.
function matchRank(candidate: string, typed: string, anywhere: boolean): number | null {
  const words = ` ${candidate.replace(/[-'’/]+/g, ' ').replace(/\s+/g, ' ')}`;
  const wanted = typed.replace(/[-'’/]+/g, ' ').replace(/\s+/g, ' ');
  if (words.startsWith(` ${wanted}`)) return 0;
  if (words.includes(` ${wanted}`)) return 1;
  return anywhere && candidate.includes(typed) ? 2 : null;
}

const SPACELESS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;

// The holiday's runs in the year before today's to the year after, enough to
// find its next day without working out every year.
function nearRuns(def: HolidayDef, today: string): DayRange[] {
  const year = Number(today.slice(0, 4));
  return [year - 1, year, year + 1].flatMap((y) => {
    const o = occurrenceIn(def, y);
    return o ? [{ from: o.start, to: o.end }] : [];
  });
}

function nextOnOrAfter(runs: DayRange[], today: string): string | null {
  let best: string | null = null;
  for (const run of runs) {
    const day = run.to < today ? null : run.from > today ? run.from : today;
    if (day && (!best || day < best)) best = day;
  }
  return best;
}

// The holidays and special days whose name (English, aliases, or the page's
// language) has a word beginning with the typed text, best match first, then
// the cultural holidays before the specialty days, then the soonest.
export function suggestHolidays(text: string, locale: Locale, today: string, limit: number, zone = 'UTC'): HolidaySuggestion[] {
  const typed = lower(text);
  if (typed.length < 2) return [];
  const anywhere = SPACELESS.test(typed);
  const found: (HolidaySuggestion & { rank: number })[] = [];
  const rankOf = (names: string[]) => {
    const ranks = names.map((name) => matchRank(lower(name), typed, anywhere)).filter((rank): rank is number => rank !== null);
    return ranks.length ? Math.min(...ranks) : null;
  };
  for (const def of HOLIDAYS) {
    const label = holidayLabel(def.id, locale) ?? def.name;
    const rank = rankOf([def.name, label, ...(def.aliases ?? [])]);
    if (rank !== null) found.push({ name: def.name, label, kind: 'holiday', next: nextOnOrAfter(nearRuns(def, today), today), rank });
  }
  // "solstice" or "equinox" alone are as good a start as the season.
  for (const a of ASTRONOMY) {
    const rank = rankOf([a.name, ...a.aliases, a.name.split(' ').pop()!]);
    if (rank !== null) found.push({ name: a.name, label: a.name, kind: 'astronomy', next: nextOnOrAfter(astronomyRuns(a.titles, zone), today), rank });
  }
  // A special day the catalog also keeps (Halloween) is suggested once, as the holiday.
  const kept = new Set(found.map((suggestion) => lower(suggestion.name)));
  for (const day of specialtyDayNames(locale)) {
    const rank = rankOf([day.name, day.label]);
    if (rank === null || kept.has(lower(day.name))) continue;
    const year = Number(today.slice(0, 4));
    const next = day.monthDays
      .flatMap((monthDay) => [`${year}-${monthDay}`, `${year + 1}-${monthDay}`])
      .filter((date) => date >= today && (!date.endsWith('02-29') || isLeap(Number(date.slice(0, 4)))))
      .sort()[0];
    found.push({ name: day.name, label: day.label, kind: 'special', next: next ?? null, rank });
  }
  const order = (kind: HolidaySuggestion['kind']) => ['holiday', 'astronomy', 'special'].indexOf(kind);
  return found
    .sort((a, b) => a.rank - b.rank || order(a.kind) - order(b.kind) || (a.next ?? '9').localeCompare(b.next ?? '9') || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ rank: _rank, ...suggestion }) => suggestion);
}
