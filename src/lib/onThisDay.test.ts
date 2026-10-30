import { describe, expect, it } from 'vitest';
import { allMonthDays, isMonthDay, neighbourMonthDay } from './onThisDay';

describe('on this day', () => {
  it('accepts real calendar days, February 29 included', () => {
    expect(isMonthDay('02-29')).toBe(true);
    expect(isMonthDay('02-30')).toBe(false);
    expect(isMonthDay('13-01')).toBe(false);
    expect(isMonthDay('2-9')).toBe(false);
  });
  it('lists 366 days', () => {
    expect(allMonthDays()).toHaveLength(366);
  });
  it('steps across month and year ends', () => {
    expect(neighbourMonthDay('03-01', -1)).toBe('02-29');
    expect(neighbourMonthDay('12-31', 1)).toBe('01-01');
    expect(neighbourMonthDay('01-01', -1)).toBe('12-31');
  });
});
