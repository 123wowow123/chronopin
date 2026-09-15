// The vocabulary of "posted within" spans: the windows on offer, the words
// they are shown as, and what a person may type for one. Shared by the
// timeline filter, the map's range and the preferences page.

export const SPAN_OPTIONS = ['12h', '1d', '3d', '5d', '1w', '1mo', '1y'];
// Windows around now for when pins start (the map, relevance search). A place or
// a search match stays relevant longer than a posting window, so wider spans.
// '0d' is "nothing on that side".
export const EVENT_SPAN_OPTIONS = ['0d', '1d', '1w', '1mo', '1y', '3y', '5y'];
// Where every "posted within" filter starts without a saved preference: null
// is unbounded ("All").
export const DEFAULT_POSTED_WITHIN: string | null = null;

// "5d" -> "5 days"; null (unbounded) -> "All".
export const spanLabel = (within: string | null | undefined) => formatSpan(within) || 'All';

// A window of start dates around now in brief, for a pill: "±1 year",
// "−1 week +All", "All".
export function eventSpanSummary(past: string | null, future: string | null) {
  if (past === future) return past ? `±${spanLabel(past)}` : 'All';
  return `−${spanLabel(past)} +${spanLabel(future)}`;
}

type Unit = { value: string; label: string; typed: RegExp; calendar?: boolean };

// The patterns are mutually exclusive: "m" is minutes and only "mo" onwards is
// months, so neither can swallow the other.
const UNITS: Unit[] = [
  { value: 'm', label: 'minutes', typed: /^m(in(ute)?s?)?$/ },
  { value: 'h', label: 'hours', typed: /^h(r?s?|ours?)?$/ },
  { value: 'd', label: 'days', typed: /^d(ays?)?$/ },
  { value: 'w', label: 'weeks', typed: /^w(k?s?|eeks?)?$/ },
  { value: 'mo', label: 'months', typed: /^mo(n(th)?s?)?$/, calendar: true },
  { value: 'y', label: 'years', typed: /^y(r?s?|ears?)?$/, calendar: true },
];

// Rough day-equivalents, only for comparing spans' relative size.
const UNIT_DAYS: Record<string, number> = { m: 1 / 1440, h: 1 / 24, d: 1, w: 7, mo: 30.437, y: 365.25 };

function parseSpan(within: string | null | undefined) {
  const match = /^(\d+(?:\.\d+)?)(mo|m|h|d|w|y)$/.exec(within || '');
  const unit = match && UNITS.find((u) => u.value === match[2]);
  return match && unit ? { count: parseFloat(match[1]), unit } : null;
}

// "5d" -> "5 days", "1d" -> "1 day".
export function formatSpan(within: string | null | undefined): string | null {
  const parsed = parseSpan(within);
  if (!parsed) return null;
  const label = parsed.count === 1 ? parsed.unit.label.replace(/s$/, '') : parsed.unit.label;
  return `${parsed.count} ${label}`;
}

// Whatever someone types ("10 days", "10D", "10") to wire form ("10d"), or
// null. allowZero is for callers where 0 means "nothing in this direction".
export function parseTypedSpan(text: string, allowZero = false): string | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]*)\s*$/i.exec(text || '');
  if (!match) return null;
  const count = parseFloat(match[1]);
  if (count < 0 || (count === 0 && !allowZero)) return null;
  const word = match[2].toLowerCase();
  const unit = word ? UNITS.find((u) => u.typed.test(word)) : UNITS.find((u) => u.value === 'd');
  if (!unit || (unit.calendar && count % 1 !== 0)) return null;
  return `${count}${unit.value}`;
}

export function isSpan(within: string | null | undefined): boolean {
  return !!formatSpan(within);
}

// A span in a URL parameter: absent means the page's default, "all" unbounded.
export function spanFromParam(value: string | null | undefined, fallback: string | null): string | null {
  if (value === 'all') return null;
  return value && isSpan(value) ? value : fallback;
}

export function spanToParam(within: string | null, fallback: string | null): string | null {
  return within === fallback ? null : (within ?? 'all');
}

export function approxDays(within: string | null | undefined): number | null {
  const parsed = parseSpan(within);
  return parsed ? parsed.count * UNIT_DAYS[parsed.unit.value] : null;
}

// fromDate shifted by a span: backward when signum is negative. Calendar
// units land on the same day next/last month or year.
export function offsetDate(fromDate: Date, within: string, signum: number): Date | null {
  const parsed = parseSpan(within);
  if (!parsed) return null;
  const amount = parsed.count * (signum < 0 ? -1 : 1);
  const d = new Date(fromDate);
  switch (parsed.unit.value) {
    case 'y':
      d.setFullYear(d.getFullYear() + amount);
      return d;
    case 'mo':
      d.setMonth(d.getMonth() + amount);
      return d;
    default:
      return new Date(d.getTime() + amount * UNIT_DAYS[parsed.unit.value] * 86_400_000);
  }
}
