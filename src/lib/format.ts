// Display formatting shared by server and client components. Ported from the
// Angular filters (money, timespan, astroweek, timeAgo) and pluralize.

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
  const tier = (Math.log10(Math.abs(value)) / 3) | 0;
  if (tier <= 0) {
    return symbol + (Math.round(value * 100) / 100).toFixed(2);
  }
  const scaled = value / Math.pow(10, tier * 3);
  let formatted = scaled.toFixed(1);
  if (/\.0$/.test(formatted)) {
    formatted = formatted.slice(0, -2);
  }
  return symbol + formatted + SI_POSTFIXES[tier];
}

// "1 day", "3 days", "-1 days", "1.0 years" - singular only for exactly the
// number 1, as the pluralize library the Angular app used did.
export function pluralize(word: string, count: number | string, inclusive = true): string {
  const plural = count === 1 ? word : `${word}s`;
  return inclusive ? `${count} ${plural}` : plural;
}

const DAY_MS = 86_400_000;

// A date key ("2026-09-14") to its UTC midnight in ms.
export function dayKeyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Whole days from `fromKey` to `toKey` (positive when toKey is later).
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dayKeyToMs(toKey) - dayKeyToMs(fromKey)) / DAY_MS);
}

// The countdown tag beside a date: "Today", "5 days", "-3 days", or in years
// once a year or more away ("1.2 years") when format is 'y'.
export function timespan(fromTodayKey: string, dayKey: string, format: 'd' | 'y' = 'd'): string {
  const days = daysBetween(fromTodayKey, dayKey);
  if (days === 0) {
    return 'Today';
  }
  if (format === 'y' && Math.abs(days) >= 365) {
    return pluralize('year', yearsBetween(fromTodayKey, dayKey).toFixed(1));
  }
  return pluralize('day', days);
}

// Fractional years between two date keys, the way moment's diff(..., 'years',
// true) measures it: whole months, then the part month by its own length.
function yearsBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const wholeMonths = (ty - fy) * 12 + (tm - fm);
  const anchor = Date.UTC(fy, fm - 1 + wholeMonths, fd);
  const target = Date.UTC(ty, tm - 1, td);
  const next = Date.UTC(fy, fm - 1 + wholeMonths + (target >= anchor ? 1 : -1), fd);
  const fraction = (target - anchor) / Math.abs(next - anchor);
  return (wholeMonths + fraction) / 12;
}

// The planet each weekday is named for, and the glyph the Astronomic Signs
// font draws for it.
const WEEKDAYS = [
  { planet: 'The Sun', glyph: 'B' },
  { planet: 'The Moon', glyph: 'A' },
  { planet: 'Mars', glyph: 'E' },
  { planet: 'Mercury', glyph: 'D' },
  { planet: 'Jupiter', glyph: 'F' },
  { planet: 'Venus', glyph: 'C' },
  { planet: 'Saturn', glyph: 'G' },
];

export function weekdayPlanet(dayKey: string) {
  const weekday = new Date(dayKeyToMs(dayKey)).getUTCDay();
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(dayKeyToMs(dayKey));
  return { ...WEEKDAYS[weekday], weekday: name };
}

// "09/14/2026" for a date key.
export function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-');
  return `${m}/${d}/${y}`;
}

// The calendar date ("2026-09-14") an instant falls on in a time zone.
export function dayKeyIn(instant: Date | string | number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// "09/12/2026 at 9:02 pm" in a time zone.
export function formatPosted(instant: string | Date, timeZone: string): string {
  const d = new Date(instant);
  const date = new Intl.DateTimeFormat('en-US', { timeZone, month: '2-digit', day: '2-digit', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(d);
  return `${date} at ${time.toLowerCase()}`;
}

// "Starts 09/14/2026" (all day, read in UTC where the date is stored) or
// "Starts 09/14/2026 4:00PM" in the viewer's zone.
export function formatStart(
  pin: { utcStartDateTime: string; allDay?: boolean },
  timeZone: string,
  { allDaySuffix = false }: { allDaySuffix?: boolean } = {},
): string {
  const d = new Date(pin.utcStartDateTime);
  if (pin.allDay) {
    const date = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric' }).format(d);
    return `Starts ${date}${allDaySuffix ? ' - All day' : ''}`;
  }
  const date = new Intl.DateTimeFormat('en-US', { timeZone, month: '2-digit', day: '2-digit', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(d).replace(' ', '');
  return `Starts ${date} ${time}`;
}

// "3 hours ago", "in 2 days".
export function timeAgo(instant: string | Date, now = Date.now()): string {
  const seconds = Math.round((new Date(instant).getTime() - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return rtf.format(seconds, 'second');
}

// A rating the way its source shows it: Rotten Tomatoes and AniList as a
// percentage ("92%"), everyone else as a score out of its maximum ("8.67/10",
// Metacritic's "82/100").
const PERCENT_SOURCES = new Set(['rotten tomatoes', 'anilist']);

export function ratingScore(score: number, scoreMax: number, source?: string): string {
  if (scoreMax === 100 && PERCENT_SOURCES.has((source ?? '').toLowerCase())) {
    return `${Math.round(score)}%`;
  }
  const plain = (n: number) => String(Number(n.toFixed(2)));
  return `${plain(score)}/${plain(scoreMax)}`;
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
