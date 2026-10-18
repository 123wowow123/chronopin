// The specialty days ("National Peanut Day") of each calendar date, named in
// the page's language. The dates and their English names are
// data/specialtyDays.json (`npm run specialty-days:build`); each other
// language maps those names to its own in data/specialtyDays.<locale>.json
// (`npm run specialty-days:translate`). A name a language lacks stays English.

import type { Locale } from '@/lib/i18n/config';
import type { SpecialtyDay } from '@/lib/specialtyDays';
import english from './data/specialtyDays.json';
import traditions from './data/specialtyTraditions.json';
import traditionLabels from './data/specialtyTraditions.labels.json';
import ar from './data/specialtyDays.ar.json';
import de from './data/specialtyDays.de.json';
import es from './data/specialtyDays.es.json';
import fr from './data/specialtyDays.fr.json';
import hi from './data/specialtyDays.hi.json';
import indonesian from './data/specialtyDays.id.json';
import ja from './data/specialtyDays.ja.json';
import ko from './data/specialtyDays.ko.json';
import ms from './data/specialtyDays.ms.json';
import it from './data/specialtyDays.it.json';
import pt from './data/specialtyDays.pt.json';
import ru from './data/specialtyDays.ru.json';
import th from './data/specialtyDays.th.json';
import vi from './data/specialtyDays.vi.json';
import zh from './data/specialtyDays.zh.json';

const NAMES = english as Record<string, string[]>;
const LABELS: Partial<Record<Locale, Record<string, string>>> = { ar, de, es, fr, hi, id: indonesian, it, ja, ko, ms, pt, ru, th, vi, zh };

const TRADITIONS = traditions as Record<string, string[]>;
const TRADITION_LABELS = traditionLabels as Record<string, Partial<Record<Locale, string>>>;

// One date's ("09-24") specialty days. A day with customs of its own comes
// first (the tag shows the first, and its customs under it).
export function specialtyDaysOn(monthDay: string, locale: Locale): SpecialtyDay[] {
  const labels = LABELS[locale];
  const days = (NAMES[monthDay] ?? []).map((name): SpecialtyDay => {
    const day: SpecialtyDay = { name, label: labels?.[name] || name };
    if (TRADITIONS[name]) day.traditions = TRADITIONS[name].map((t) => ({ name: t, label: TRADITION_LABELS[t]?.[locale] || t }));
    return day;
  });
  return [...days.filter((d) => d.traditions), ...days.filter((d) => !d.traditions)];
}

// Every date's, keyed like specialtyDays.json.
export function allSpecialtyDays(locale: Locale): Record<string, SpecialtyDay[]> {
  return Object.fromEntries(Object.keys(NAMES).map((monthDay) => [monthDay, specialtyDaysOn(monthDay, locale)]));
}

// Every specialty day by English name, with the dates ("09-13") it falls on
// each year and its name in the page's language - what holiday: search and
// its suggestions read.
export function specialtyDayNames(locale: Locale): { name: string; label: string; monthDays: string[] }[] {
  const dates = (DATES_BY_NAME ??= (() => {
    const found = new Map<string, string[]>();
    for (const [monthDay, names] of Object.entries(NAMES)) for (const name of names) found.set(name, [...(found.get(name) ?? []), monthDay]);
    return found;
  })());
  const labels = LABELS[locale];
  return [...dates].map(([name, monthDays]) => ({ name, label: labels?.[name] || name, monthDays }));
}

let DATES_BY_NAME: Map<string, string[]> | undefined;
