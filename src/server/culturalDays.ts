// The cultural holidays (src/lib/culturalDays.ts) on each date, worked out
// per year and named in the page's language. The dates come from the
// date-holidays package, which knows the Chinese, Islamic and Hebrew calendars;
// each language's names are data/culturalDays.<locale>.json (a map from the
// English name of a holiday or tradition to its label; a name a language lacks
// stays English).

import Holidays from 'date-holidays';
import type { Locale } from '@/lib/i18n/config';
import { addDays, HOLIDAYS, holidayById, type CulturalDay, type HolidayDef } from '@/lib/culturalDays';
import ar from './data/culturalDays.ar.json';
import de from './data/culturalDays.de.json';
import es from './data/culturalDays.es.json';
import fr from './data/culturalDays.fr.json';
import hi from './data/culturalDays.hi.json';
import indonesian from './data/culturalDays.id.json';
import it from './data/culturalDays.it.json';
import ja from './data/culturalDays.ja.json';
import ko from './data/culturalDays.ko.json';
import ms from './data/culturalDays.ms.json';
import pt from './data/culturalDays.pt.json';
import ru from './data/culturalDays.ru.json';
import th from './data/culturalDays.th.json';
import vi from './data/culturalDays.vi.json';
import zh from './data/culturalDays.zh.json';

const LABELS: Partial<Record<Locale, Record<string, string>>> = { ar, de, es, fr, hi, id: indonesian, it, ja, ko, ms, pt, ru, th, vi, zh };

// The years the catalog is worked out for: the DateTime markers' own range.
export const FIRST_YEAR = 1986;
export const LAST_YEAR = 2100;

export type Occurrence = { def: HolidayDef; start: string; end: string };

const countries = new Map<string, Holidays>();
function countryHolidays(country: string): Holidays {
  let hd = countries.get(country);
  if (!hd) countries.set(country, (hd = new Holidays(country)));
  return hd;
}

// Where the package says a country's holiday of that English name falls in a year.
function packageDate(country: string, name: string, year: number): string | null {
  const found = countryHolidays(country)
    .getHolidays(year, 'en')
    .find((h) => h.name === name);
  return found ? found.date.slice(0, 10) : null;
}

function startOf(def: HolidayDef, year: number, easter: () => string | null): string | null {
  const rule = def.rule;
  if ('country' in rule) return packageDate(rule.country, rule.name, year);
  if ('fixed' in rule) return `${year}-${rule.fixed}`;
  if ('easter' in rule) {
    const date = easter();
    return date ? addDays(date, rule.easter) : null;
  }
  const other = holidayById(rule.sameAs);
  return other ? startOf(other, year, easter) : null;
}

const yearCache = new Map<number, Occurrence[]>();

// Every holiday that starts in the year (one that runs past New Year's Eve
// ends in the next year, and is tagged there too).
export function occurrencesIn(year: number): Occurrence[] {
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) return [];
  const cached = yearCache.get(year);
  if (cached) return cached;
  let easterDate: string | null | undefined;
  const easter = () => (easterDate === undefined ? (easterDate = packageDate('US', 'Easter Sunday', year)) : easterDate);
  const found: Occurrence[] = [];
  for (const def of HOLIDAYS) {
    const start = startOf(def, year, easter);
    if (start) found.push({ def, start, end: addDays(start, (def.span ?? 1) - 1) });
  }
  yearCache.set(year, found);
  return found;
}

// The holidays whose days reach `dayKey` ("2026-09-25"): those that start in
// its year or the year before (a Hanukkah that began in December).
export function occurrencesOn(dayKey: string): (Occurrence & { day: number })[] {
  const year = Number(dayKey.slice(0, 4));
  return [...occurrencesIn(year - 1), ...occurrencesIn(year)]
    .filter((o) => o.start <= dayKey && dayKey <= o.end)
    .map((o) => ({ ...o, day: Math.round((Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${o.start}T00:00:00Z`)) / 86400000) + 1 }));
}

function named(def: HolidayDef, day: number, locale: Locale): CulturalDay {
  const labels = LABELS[locale];
  const label = (name: string) => labels?.[name] || name;
  return { id: def.id, name: def.name, label: label(def.name), day, traditions: def.traditions.map((name) => ({ name, label: label(name) })) };
}

// One date's holidays, each with its traditions.
export function culturalDaysOn(dayKey: string, locale: Locale): CulturalDay[] {
  return occurrencesOn(dayKey).map((o) => named(o.def, o.day, locale));
}

// Every date of a year that has one ({ "2026-09-25": [...] }), for a timeline
// that tags each of its days: a year at a time, ~15KB.
export function culturalDaysInYear(year: number, locale: Locale): Record<string, CulturalDay[]> {
  const days: Record<string, CulturalDay[]> = {};
  for (const o of [...occurrencesIn(year - 1), ...occurrencesIn(year)]) {
    for (let i = 0; i < (o.def.span ?? 1); i++) {
      const key = addDays(o.start, i);
      if (key.startsWith(`${year}-`)) (days[key] ??= []).push(named(o.def, i + 1, locale));
    }
  }
  return days;
}

// The holidays whose ad window (a month before to three weeks after) holds
// `today`, with how many days it is from each one's first day.
export function holidaysInWindow(today: string, windowBefore: number, windowAfter: number): { id: string; start: string; offset: number }[] {
  const year = Number(today.slice(0, 4));
  const out: { id: string; start: string; offset: number }[] = [];
  for (const o of [...occurrencesIn(year - 1), ...occurrencesIn(year), ...occurrencesIn(year + 1)]) {
    const offset = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${o.start}T00:00:00Z`)) / 86400000);
    if (offset >= -windowBefore && offset <= (o.def.span ?? 1) - 1 + windowAfter) out.push({ id: o.def.id, start: o.start, offset });
  }
  return out;
}

// The holidays of just these dates ("2026-09-25"), keyed by date: what a page
// draws first, before the year's whole map is fetched.
export function culturalDaysFor(dayKeys: Iterable<string>, locale: Locale): Record<string, CulturalDay[]> {
  const days: Record<string, CulturalDay[]> = {};
  for (const key of dayKeys) {
    const found = culturalDaysOn(key, locale);
    if (found.length) days[key] = found;
  }
  return days;
}

// A holiday's name in the page's language ("Mid-Autumn Festival", "中秋节").
export function holidayLabel(id: string, locale: Locale): string | null {
  const def = holidayById(id);
  return def ? (LABELS[locale]?.[def.name] || def.name) : null;
}
