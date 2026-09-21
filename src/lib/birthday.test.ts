import { describe, expect, it } from 'vitest';
import { birthdayProblem, EARLIEST_BIRTHDAY } from './birthday';

const TODAY = '2026-09-21';

describe('birthdayProblem', () => {
  it('lets an optional birthday go unanswered', () => {
    expect(birthdayProblem(undefined, TODAY)).toBeUndefined();
    expect(birthdayProblem(null, TODAY)).toBeUndefined();
    expect(birthdayProblem('', TODAY)).toBeUndefined();
  });

  it('takes a day key', () => {
    expect(birthdayProblem('1984-02-29', TODAY)).toBeUndefined();
    expect(birthdayProblem(EARLIEST_BIRTHDAY, TODAY)).toBeUndefined();
    expect(birthdayProblem(TODAY, TODAY)).toBeUndefined();
  });

  it('refuses anything that is not a day', () => {
    expect(birthdayProblem('1984', TODAY)).toBe('format');
    expect(birthdayProblem('02/29/1984', TODAY)).toBe('format');
    expect(birthdayProblem('1983-02-29', TODAY)).toBe('format');
    expect(birthdayProblem('1984-13-01', TODAY)).toBe('format');
    expect(birthdayProblem(1984, TODAY)).toBe('format');
  });

  it('refuses a day outside a lifetime', () => {
    expect(birthdayProblem('1899-12-31', TODAY)).toBe('range');
    expect(birthdayProblem('2026-09-22', TODAY)).toBe('range');
  });
});
