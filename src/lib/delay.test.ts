import { describe, expect, it } from 'vitest';
import { delayLabel, delayProblem, pinDelay } from './delay';

describe('delayLabel', () => {
  it('counts days, then weeks, then months, then half years', () => {
    expect(delayLabel('2026-03-01', '2026-03-02')).toBe('1 day');
    expect(delayLabel('2026-03-01', '2026-03-11')).toBe('10 days');
    expect(delayLabel('2026-03-01', '2026-04-05')).toBe('5 weeks');
    expect(delayLabel('2026-04-15', '2026-08-14')).toBe('4 months');
    expect(delayLabel('2027-12-31', '2032-12-31')).toBe('5 years');
    expect(delayLabel('2025-10-01', '2026-11-19')).toBe('13 months');
    expect(delayLabel('2025-01-01', '2026-07-01')).toBe('1.5 years');
    expect(delayLabel('2025-01-01', '2027-02-01')).toBe('2 years');
  });
});

describe('pinDelay', () => {
  it('measures from the original day to the start as a UTC day', () => {
    expect(pinDelay({ originalStartDate: '2029-12-31', utcStartDateTime: '2033-12-31T00:00:00.000Z' })).toEqual({
      from: '2029-12-31',
      days: 1461,
      label: '4 years',
    });
  });

  it('is null without an original date, or when the start is not later', () => {
    expect(pinDelay({ utcStartDateTime: '2033-12-31T00:00:00.000Z' })).toBeNull();
    expect(pinDelay({ originalStartDate: '2033-12-31', utcStartDateTime: '2033-12-31T00:00:00.000Z' })).toBeNull();
    expect(pinDelay({ originalStartDate: '2034-06-01', utcStartDateTime: '2033-12-31T00:00:00.000Z' })).toBeNull();
  });
});

describe('delayProblem', () => {
  it('takes a YYYY-MM-DD day and short reasoning, or neither', () => {
    expect(delayProblem({})).toBeUndefined();
    expect(delayProblem({ originalStartDate: '2027-12-31', delayReasoning: 'Stated.' })).toBeUndefined();
    expect(delayProblem({ originalStartDate: 'late 2027' })).toMatch(/YYYY-MM-DD/);
    expect(delayProblem({ originalStartDate: '2027-13-40' })).toMatch(/YYYY-MM-DD/);
    expect(delayProblem({ delayReasoning: 'x'.repeat(2001) })).toMatch(/2000/);
  });
});
