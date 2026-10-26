// The hour and place of birth: optional, private, and only ever used to cast
// the user's own chart (src/lib/transits.ts). Checked by the profile form and
// again by the API.

import { TZDate } from '@date-fns/tz';

export type BirthProblem = 'time' | 'place';

// undefined when the time may be saved; empty and null mean "not given".
export function birthTimeProblem(time: unknown): 'time' | undefined {
  if (time == null || time === '') return undefined;
  return typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? undefined : 'time';
}

// The instant of birth: the wall-clock time at the birthplace, in that
// place's zone as it was on the day (the tz database keeps old offsets and
// daylight saving). Null when the day or time does not parse.
export function birthMoment(birthday: string, time: string, timeZone: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  try {
    const at = new TZDate(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]), 0, timeZone);
    return Number.isNaN(at.getTime()) ? null : new Date(at.getTime());
  } catch {
    return null;
  }
}
