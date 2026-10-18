// A user's birthday: a day key, as the pins' dates are, and optional
// everywhere. The sign-up form and the profile check it to show a translated
// message; the API checks it again, because anyone can post to it.

import { compareDayKeys, dayKeyIn, dayKeyToMs } from './format';

// The floor the column's CHECK holds as well (0058). The oldest person ever
// verified reached 122, so an earlier year is a typo, not a birthday.
export const EARLIEST_BIRTHDAY = '1900-01-01';

export type BirthdayProblem = 'format' | 'range';

// Today as a UTC day. A birthday is the same day wherever it is read, and
// nobody signs up on the day they are born, so the few hours a viewer's own
// day can run ahead of this one never decide a real answer.
export function birthdayToday(): string {
  return dayKeyIn(Date.now(), 'UTC');
}

// undefined when the birthday may be saved. Missing and empty are both fine:
// the field is optional, and clearing it is how a user takes it back.
export function birthdayProblem(birthday: unknown, today: string = birthdayToday()): BirthdayProblem | undefined {
  if (birthday == null || birthday === '') {
    return undefined;
  }
  if (typeof birthday !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return 'format';
  }
  // A day that reads back as the day it was written is a real one. Date.parse
  // would not do: it rolls the 30th of February over into March rather than
  // refusing it.
  if (dayKeyIn(dayKeyToMs(birthday), 'UTC') !== birthday) {
    return 'format';
  }
  if (compareDayKeys(birthday, EARLIEST_BIRTHDAY) < 0 || compareDayKeys(birthday, today) > 0) {
    return 'range';
  }
  return undefined;
}

// What an API client is told, in English; the forms translate the code instead.
export function birthdayMessage(problem: BirthdayProblem): string {
  return problem === 'format'
    ? 'birthday must be a YYYY-MM-DD day.'
    : `birthday must fall between ${EARLIEST_BIRTHDAY} and today.`;
}
