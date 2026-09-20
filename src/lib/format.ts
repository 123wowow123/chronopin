// Display formatting shared by server and client components. Ported from the
// Angular filters (money, timespan, astroweek, timeAgo) and pluralize. The
// functions that print words take the page's language last (English by
// default); their words are in src/lib/i18n/formatWords.ts.

import { INTL_LOCALES, type Locale } from './i18n/config';
import { fillWords, FORMAT_WORDS } from './i18n/formatWords';

// ISO 4217 code -> what to print in front of the figure. A code that is not
// listed prints as itself ("AED 128B"), the honest reading for a currency with
// no widely recognised symbol.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: 'CN¥',
  INR: '₹', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', HKD: 'HK$',
  SGD: 'S$', KRW: '₩', RUB: '₽', BRL: 'R$', MXN: 'MX$',
  TRY: '₺', ILS: '₪', THB: '฿', TWD: 'NT$', PHP: '₱',
  VND: '₫', NGN: '₦', SEK: 'kr', NOK: 'kr', DKK: 'kr',
};

const SI_POSTFIXES = ['', 'K', 'M', 'B', 'T', 'P', 'E'];

// 999 -> "$999.00", 6400000000 CAD -> "C$6.4B". No currency recorded means
// the old dollar-only data, which was all USD product prices.
export function money(value: number, currency?: string | null): string {
  let symbol = currency ? CURRENCY_SYMBOLS[currency] || currency : '$';
  // "AED 128B" and "kr 52.6B" need the gap; "A$27B" and "€6.4B" do not.
  if (/[A-Za-z]$/.test(symbol)) {
    symbol += ' ';
  }
  return symbol + (abbreviate(value) ?? (Math.round(value * 100) / 100).toFixed(2));
}

// 1500 -> "1.5K", 2000000 -> "2M"; null under a thousand, which each caller
// prints its own way. A figure that rounds up to the next tier takes it
// (999950 -> "1M", not "1000K").
function abbreviate(value: number): string | null {
  let tier = (Math.log10(Math.abs(value)) / 3) | 0;
  if (tier <= 0) {
    return null;
  }
  let formatted = (value / Math.pow(10, tier * 3)).toFixed(1);
  if (Math.abs(Number(formatted)) >= 1000 && tier < SI_POSTFIXES.length - 1) {
    tier += 1;
    formatted = (value / Math.pow(10, tier * 3)).toFixed(1);
  }
  if (/\.0$/.test(formatted)) {
    formatted = formatted.slice(0, -2);
  }
  return formatted + SI_POSTFIXES[tier];
}

// A count shortened as it grows: 999 -> "999", 1500 -> "1.5K", 2300000 -> "2.3M".
export function compactCount(value: number): string {
  return abbreviate(value) ?? String(Math.round(value));
}

// Dollars in the page's own words: "$3.9M", "3,9 Mio. $". Used for the money
// traded on a prediction market, which runs to millions and is never worth a
// cent of precision.
export function compactUsd(locale: Locale): Intl.NumberFormat {
  return new Intl.NumberFormat(INTL_LOCALES[locale], { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
}

// "1 day", "3 days", "-1 days", "1.0 years" - singular only for exactly the
// number 1, as the pluralize library the Angular app used did.
export function pluralize(word: string, count: number | string, inclusive = true): string {
  const plural = count === 1 ? word : `${word}s`;
  return inclusive ? `${count} ${plural}` : plural;
}

const DAY_MS = 86_400_000;

// Day keys ("2026-09-14") name a calendar day in the proleptic Gregorian
// calendar. The year is astronomical and at least four digits: 1 BC is "0000"
// and 2561 BC "-2560", so the timeline's oldest pins get keys of their own
// rather than the year Intl prints without its era. Compare keys with
// compareDayKeys, never as strings: "-2560" is not before "-0279" as text. The
// month and day are always the last five characters (monthDayOf).

export function dayKeyOf(year: number, month: number, day: number): string {
  const pad = (n: number, width: number) => String(Math.abs(n)).padStart(width, '0');
  return `${year < 0 ? '-' : ''}${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function dayKeyParts(key: string): [year: number, month: number, day: number] {
  const match = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Not a day key: ${key}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// "09-14", for what recurs every year (specialty days).
export function monthDayOf(key: string): string {
  return key.slice(-5);
}

// UTC midnight in ms. Date.UTC reads years 0-99 as 1900-1999, so the year is
// set on its own; months past 12 roll over as Date.UTC's do.
function utcMidnight(year: number, month: number, day: number): number {
  return new Date(0).setUTCFullYear(year, month - 1, day);
}

// A date key to its UTC midnight in ms.
export function dayKeyToMs(key: string): number {
  return utcMidnight(...dayKeyParts(key));
}

// For sorting: negative when a is the earlier day.
export function compareDayKeys(a: string, b: string): number {
  return dayKeyToMs(a) - dayKeyToMs(b);
}

// Whole days from `fromKey` to `toKey` (positive when toKey is later).
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dayKeyToMs(toKey) - dayKeyToMs(fromKey)) / DAY_MS);
}

// "5 days", "1.2 years" in a language other than English.
function unitCount(value: number, unit: 'day' | 'year', locale: Locale, fractionDigits = 0): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: 'unit',
    unit,
    unitDisplay: 'long',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

// The countdown tag beside a date: "Today", "5 days", "-3 days", or in years
// once a year or more away ("1.2 years") when format is 'y'.
export function timespan(fromTodayKey: string, dayKey: string, format: 'd' | 'y' = 'd', locale: Locale = 'en'): string {
  const days = daysBetween(fromTodayKey, dayKey);
  if (days === 0) {
    return FORMAT_WORDS[locale].today;
  }
  if (format === 'y' && Math.abs(days) >= 365) {
    const years = yearsBetween(fromTodayKey, dayKey);
    return locale === 'en' ? pluralize('year', years.toFixed(1)) : unitCount(years, 'year', locale, 1);
  }
  return locale === 'en' ? pluralize('day', days) : unitCount(days, 'day', locale);
}

// How far a day is from today, for a card shown away from the timeline:
// "Today", "in 5 days", "3 days ago", and in years once a year or more away
// ("in 1.2 years", "4586.7 years ago").
export function daysAway(fromTodayKey: string, dayKey: string, locale: Locale = 'en'): string {
  const days = daysBetween(fromTodayKey, dayKey);
  if (days === 0) {
    return FORMAT_WORDS[locale].today;
  }
  if (locale !== 'en') {
    const years = Math.abs(days) >= 365;
    const value = years ? Number(yearsBetween(fromTodayKey, dayKey).toFixed(1)) : days;
    return relativeFormat(locale).format(value, years ? 'year' : 'day');
  }
  const span = Math.abs(days) >= 365 ? pluralize('year', Math.abs(yearsBetween(fromTodayKey, dayKey)).toFixed(1)) : pluralize('day', Math.abs(days));
  return days > 0 ? `in ${span}` : `${span} ago`;
}

// Fractional years between two date keys, the way moment's diff(..., 'years',
// true) measures it: whole months, then the part month by its own length.
function yearsBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = dayKeyParts(fromKey);
  const [ty, tm, td] = dayKeyParts(toKey);
  const wholeMonths = (ty - fy) * 12 + (tm - fm);
  const anchor = utcMidnight(fy, fm + wholeMonths, fd);
  const target = utcMidnight(ty, tm, td);
  const next = utcMidnight(fy, fm + wholeMonths + (target >= anchor ? 1 : -1), fd);
  const fraction = (target - anchor) / Math.abs(next - anchor);
  return (wholeMonths + fraction) / 12;
}

// The glyph the Astronomic Signs font draws for the planet each weekday is
// named for (Sunday first; the planets' names are in formatWords).
const WEEKDAYS = [
  { glyph: 'B' },
  { glyph: 'A' },
  { glyph: 'E' },
  { glyph: 'D' },
  { glyph: 'F' },
  { glyph: 'C' },
  { glyph: 'G' },
];

// Intl formatters are expensive to build and free to reuse, and these run
// once per pin: dayKeyIn is called for every pin in the timeline every time a
// page is added to it, and again for every card drawn. Building one per call
// cost 36ms per 1500 pins where reusing them costs 2ms - main-thread work in
// the browser on every scroll. Keyed by locale and options, so each viewer's
// time zone gets its own and keeps it.
const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

export function weekdayPlanet(dayKey: string, locale: Locale = 'en') {
  const weekday = new Date(dayKeyToMs(dayKey)).getUTCDay();
  const name = dateFormat(INTL_LOCALES[locale], { weekday: 'long', timeZone: 'UTC' }).format(dayKeyToMs(dayKey));
  return { ...WEEKDAYS[weekday], planet: FORMAT_WORDS[locale].planets[weekday], weekday: name };
}

// A known new moon (2000-01-06 18:14 UTC) and the mean synodic month.
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_DAYS = 29.530588853;

// The moon at noon UTC on a day, from the mean synodic month (within about
// a day of the true phase): its phase name, the share of the disc lit, and
// an SVG path of the lit part of a disc of radius `r` centred at (r, r), as
// seen from the northern hemisphere (waxing lit on the right).
export function moonPhase(dayKey: string, r = 16, locale: Locale = 'en'): { name: string; illumination: number; path: string } {
  const age = ((((dayKeyToMs(dayKey) + DAY_MS / 2 - NEW_MOON_MS) / DAY_MS) % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const phase = age / SYNODIC_DAYS;
  const cos = Math.cos(2 * Math.PI * phase);
  const waxing = phase < 0.5;
  const gibbous = cos < 0;
  // Half the disc's edge on the lit side, back along the terminator: an
  // ellipse bulging into the dark half (gibbous) or the lit half (crescent).
  const edge = waxing ? 1 : 0;
  const terminator = waxing === gibbous ? 1 : 0;
  const rx = (r * Math.abs(cos)).toFixed(2);
  const path = `M${r} 0A${r} ${r} 0 0 ${edge} ${r} ${2 * r}A${rx} ${r} 0 0 ${terminator} ${r} 0Z`;
  return { name: FORMAT_WORDS[locale].moonPhases[Math.round(phase * 8) % 8], illumination: (1 - cos) / 2, path };
}

const LUNAR_DAY_TENS =['初', '十', '廿', '三'];
const LUNAR_DAY_UNITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

// 初一 .. 初十, 十一 .. 二十, 廿一 .. 三十: how a lunar day is written.
function lunarDayName(day: number): string {
  if (day === 20) return '二十';
  if (day === 30) return '三十';
  return day % 10 ? LUNAR_DAY_TENS[Math.floor(day / 10)] + LUNAR_DAY_UNITS[day % 10] : LUNAR_DAY_TENS[day / 10 - 1] + '十';
}

// The day in the Chinese lunar calendar (农历, Nong Li): "八月初八" for
// 2026-09-18, "闰六月初八" in a leap month, with the sexagenary year for the
// title. Intl's Chinese calendar gives the month name but writes the day as a
// number. Null before 104 BC (astronomical -103), the Taichu reform the
// calendar as ICU computes it descends from.
export function lunarDate(dayKey: string, locale: Locale = 'en'): { text: string; title: string } | null {
  if (dayKeyParts(dayKey)[0] < -103) return null;
  const parts = dateFormat('zh-CN-u-ca-chinese', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(dayKeyToMs(dayKey));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = Number(get('day'));
  if (!day) return null;
  const text = get('month') + lunarDayName(day);
  const gloss = FORMAT_WORDS[locale].lunarGloss;
  return { text, title: `农历 ${get('yearName')}年${text}${gloss ? ` (${gloss})` : ''}` };
}

// A year as people write it: "2026", "79", "2561 BC".
function yearLabel(year: number, locale: Locale = 'en'): string {
  return year > 0 ? String(year) : fillWords(FORMAT_WORDS[locale].bc, { year: String(1 - year) });
}

// "09/14/2026" for a date key; "01/01/2561 BC" before the common era. Other
// languages put the day or the year first ("14/09/2026", "2026/09/14").
export function formatDayKey(dayKey: string, locale: Locale = 'en'): string {
  const [y, m, d] = dayKeyParts(dayKey);
  const { dateOrder, dateSeparator: sep } = FORMAT_WORDS[locale];
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  if (dateOrder === 'ymd') {
    return y > 0 ? `${y}${sep}${mm}${sep}${dd}` : `${yearLabel(y, locale)}${sep}${mm}${sep}${dd}`;
  }
  return dateOrder === 'dmy' ? `${dd}${sep}${mm}${sep}${yearLabel(y, locale)}` : `${mm}${sep}${dd}${sep}${yearLabel(y, locale)}`;
}

// The calendar date ("2026-09-14") an instant falls on in a time zone.
export function dayKeyIn(instant: Date | string | number, timeZone: string): string {
  const parts = dateFormat('en-CA', {
    timeZone,
    era: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const year = Number(get('year'));
  return dayKeyOf(get('era') === 'BC' ? 1 - year : year, Number(get('month')), Number(get('day')));
}

// The day after a date key.
export function nextDayKey(dayKey: string): string {
  return dayKeyIn(dayKeyToMs(dayKey) + 86_400_000, 'UTC');
}

// How far a zone's clocks are ahead of UTC at an instant, in ms.
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = dateFormat('en-US', { timeZone, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const wall = dayKeyToMs(dayKeyIn(instant, timeZone)) + ((get('hour') * 60 + get('minute')) * 60 + get('second')) * 1000;
  return wall - Math.floor(instant / 1000) * 1000;
}

// The instant (ms) a date key's day begins in a time zone: its first moment,
// which on a day starting in a DST gap is the end of the gap.
export function dayStartIn(dayKey: string, timeZone: string): number {
  const midnight = dayKeyToMs(dayKey);
  const guess = midnight - zoneOffsetMs(midnight, timeZone);
  return midnight - zoneOffsetMs(guess, timeZone);
}

// Whether an instant falls before the common era in that zone: the numeric
// dates beside a pin print 2561 BC as plain "2561".
function isBce(d: Date, timeZone: string): boolean {
  const era = dateFormat('en-US', { timeZone, era: 'short', year: 'numeric' })
    .formatToParts(d)
    .find((p) => p.type === 'era')?.value;
  return era === 'BC';
}

// " BC" for an instant before the common era in that zone, else nothing.
function eraSuffix(d: Date, timeZone: string, locale: Locale = 'en'): string {
  if (!isBce(d, timeZone)) return '';
  // "{year} BC" without the year: its words, on the date's side.
  return ` ${FORMAT_WORDS[locale].bc.replace('{year}', '').trim()}`;
}

// A numeric date in a zone: "09/12/2026" in English, the language's own order elsewhere.
function numericDate(d: Date, timeZone: string, locale: Locale): string {
  if (locale === 'en') {
    return dateFormat('en-US', { timeZone, month: '2-digit', day: '2-digit', year: 'numeric' }).format(d);
  }
  return formatDayKey(dayKeyIn(d, timeZone), locale);
}

// A clock time in a zone: "9:02 PM", "21:02".
function clockTime(d: Date, timeZone: string, locale: Locale): string {
  return dateFormat(INTL_LOCALES[locale], { timeZone, hour: 'numeric', minute: '2-digit' }).format(d);
}

// "09/12/2026 at 9:02 pm" in a time zone, or "09/12/2026" with dateOnly.
export function formatPosted(instant: string | Date, timeZone: string, { dateOnly = false }: { dateOnly?: boolean } = {}, locale: Locale = 'en'): string {
  const d = new Date(instant);
  const date = numericDate(d, timeZone, locale);
  if (dateOnly) {
    return date;
  }
  const time = clockTime(d, timeZone, locale);
  return fillWords(FORMAT_WORDS[locale].at, { date, time: locale === 'en' ? time.toLowerCase() : time });
}

// "Starts 09/14/2026" (all day, read in UTC where the date is stored) or
// "Starts 09/14/2026 4:00PM" in the viewer's zone.
export function formatStart(
  pin: { utcStartDateTime: string; allDay?: boolean },
  timeZone: string,
  { allDaySuffix = false }: { allDaySuffix?: boolean } = {},
  locale: Locale = 'en',
): string {
  const d = new Date(pin.utcStartDateTime);
  const words = FORMAT_WORDS[locale];
  // English appends the era to its month-first date; the others' formatDayKey writes it.
  const dateIn = (zone: string) => (locale === 'en' ? numericDate(d, zone, locale) + eraSuffix(d, zone, locale) : numericDate(d, zone, locale));
  if (pin.allDay) {
    return fillWords(words.starts, { date: dateIn('UTC') }) + (allDaySuffix ? ` - ${words.allDay}` : '');
  }
  const time = clockTime(d, timeZone, locale).replace(locale === 'en' ? ' ' : /(?!)/, '');
  return fillWords(words.starts, { date: `${dateIn(timeZone)} ${time}` });
}

// "3 hours ago", "in 2 days". One formatter per language.
const relativeFormats = new Map<Locale, Intl.RelativeTimeFormat>();

function relativeFormat(locale: Locale): Intl.RelativeTimeFormat {
  let format = relativeFormats.get(locale);
  if (!format) relativeFormats.set(locale, (format = new Intl.RelativeTimeFormat(INTL_LOCALES[locale], { numeric: 'auto' })));
  return format;
}

export function timeAgo(instant: string | Date, now = Date.now(), locale: Locale = 'en'): string {
  const rtf = relativeFormat(locale);
  const seconds = (new Date(instant).getTime() - now) / 1000;
  // Each unit's size in seconds and how many of it make the next unit up.
  // The count is rounded before it is compared, so 59m40s reads "1 hour ago"
  // rather than "60 minutes ago".
  const units: [Intl.RelativeTimeFormatUnit, number, number][] = [
    ['second', 1, 60],
    ['minute', 60, 60],
    ['hour', 3_600, 24],
    ['day', 86_400, 30],
    ['month', 2_592_000, 12],
  ];

  for (const [unit, size, next] of units) {
    const count = Math.round(seconds / size);
    if (Math.abs(count) < next) {
      return rtf.format(count, unit);
    }
  }
  return rtf.format(Math.round(seconds / 31_536_000), 'year');
}

// A rating the way its source shows it: Rotten Tomatoes and AniList as a
// percentage ("92%"), everyone else as a score out of its maximum ("8.67/10",
// Metacritic's "82/100").
const PERCENT_SOURCES = new Set(['rotten tomatoes', 'anilist', 'kalshi rt forecast']);

// A prediction market's forecast of a site's score (server/scrape/
// scoreMarkets.ts): shown beside the reviews, but not a review itself.
export function isForecastRating(rating: { source?: string }): boolean {
  return /\bforecast$/i.test(rating.source ?? '');
}

export function ratingScore(score: number, scoreMax: number, source?: string): string {
  if (scoreMax === 100 && PERCENT_SOURCES.has((source ?? '').toLowerCase())) {
    return `${Math.round(score)}%`;
  }
  const plain = (n: number) => String(Number(n.toFixed(2)));
  return `${plain(score)}/${plain(scoreMax)}`;
}

// One headline number for a pin's ratings: each source rescaled to a
// percentage of its own maximum, then averaged. The sources measure
// different things (a critics' aggregate, an audience mean, a site's
// weighted average), so this is a rough consensus rather than a real
// statistic - it is shown as an average, never as a source's own score.
// Undefined below two sources, where an "average" would just restate the
// single chip beside it. A market's forecast is not a review, so not counted.
export function reviewRatings<T extends { source?: string }>(ratings: T[] | undefined): T[] {
  return (ratings ?? []).filter((r) => !isForecastRating(r));
}

export function averageRating(ratings: { score: number; scoreMax: number; source?: string }[] | undefined): number | undefined {
  const usable = reviewRatings(ratings).filter((r) => Number.isFinite(r.score) && Number.isFinite(r.scoreMax) && r.scoreMax > 0);
  if (usable.length < 2) {
    return undefined;
  }
  const total = usable.reduce((sum, r) => sum + (r.score / r.scoreMax) * 100, 0);
  return Math.round(total / usable.length);
}

// Plain text from the HTML a pin description or summary may hold, for meta
// descriptions and JSON-LD.
export function plainText(html: string | null | undefined, maxLength?: number): string {
  const text = String(html || '')
    .replace(/<\/(li|p|div|h\d)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  if (!maxLength || text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
