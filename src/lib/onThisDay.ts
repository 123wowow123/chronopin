// What happened on a calendar date in history ("1904: the first New York City
// Subway line opened"), as the timeline's history tag shows it. The text is
// English, from Wikipedia's "On this day"; the url is the article it links to.
export type OnThisDay = { year: number; text: string; url: string };

// A calendar day without its year, "10-30": the key of the /on-this-day page
// and of the Wikipedia table above. February 29 is a day of its own.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isMonthDay(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

export function onThisDayPath(monthDay: string): string {
  return `/on-this-day/${monthDay}`;
}

// The day before and after, wrapping the year (03-01 <- 02-29 <- 02-28).
export function neighbourMonthDay(monthDay: string, step: 1 | -1): string {
  // 2024 is a leap year, so 02-29 takes part.
  const date = new Date(Date.UTC(2024, Number(monthDay.slice(0, 2)) - 1, Number(monthDay.slice(3)) + step));
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

// Every day of the year, for the sitemap.
export function allMonthDays(): string[] {
  const days: string[] = [];
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= DAYS_IN_MONTH[m - 1]; d++) days.push(`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return days;
}

// "October 30", in the language's own order; the year is not part of it.
export function monthDayLabel(monthDay: string, intlLocale: string): string {
  const date = new Date(Date.UTC(2024, Number(monthDay.slice(0, 2)) - 1, Number(monthDay.slice(3))));
  return new Intl.DateTimeFormat(intlLocale, { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}
