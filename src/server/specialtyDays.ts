// The specialty days ("National Peanut Day") of each calendar date, named in
// the page's language. The dates and their English names are
// data/specialtyDays.json (`npm run specialty-days:build`); each other
// language maps those names to its own in data/specialtyDays.<locale>.json
// (`npm run specialty-days:translate`). A name a language lacks stays English.

import type { Locale } from '@/lib/i18n/config';
import type { SpecialtyDay } from '@/lib/specialtyDays';
import english from './data/specialtyDays.json';
import de from './data/specialtyDays.de.json';
import es from './data/specialtyDays.es.json';
import fr from './data/specialtyDays.fr.json';
import ja from './data/specialtyDays.ja.json';
import zh from './data/specialtyDays.zh.json';

const NAMES = english as Record<string, string[]>;
const LABELS: Partial<Record<Locale, Record<string, string>>> = { de, es, fr, ja, zh };

// One date's ("09-24") specialty days.
export function specialtyDaysOn(monthDay: string, locale: Locale): SpecialtyDay[] {
  const labels = LABELS[locale];
  return (NAMES[monthDay] ?? []).map((name) => ({ name, label: labels?.[name] || name }));
}

// Every date's, keyed like specialtyDays.json.
export function allSpecialtyDays(locale: Locale): Record<string, SpecialtyDay[]> {
  return Object.fromEntries(Object.keys(NAMES).map((monthDay) => [monthDay, specialtyDaysOn(monthDay, locale)]));
}
