import { describe, expect, it } from 'vitest';
import { dateCheckReason, isDateLadder } from './predictedDates';

const odds = (closed: boolean, ...labels: string[]) => ({ closed, outcomes: labels.map((label) => ({ label, probability: 0.5 })) });

describe('isDateLadder', () => {
  it('is a market whose outcomes are all dates', () => {
    expect(isDateLadder(['November 30', 'December 15', 'December 31'])).toBe(true);
    expect(isDateLadder(['Before Jan 1, 2027', 'Before Jul 1, 2027'])).toBe(true);
    expect(isDateLadder(['Q1 2027', '2027'])).toBe(true);
    expect(isDateLadder(['Yes', 'No'])).toBe(false);
    expect(isDateLadder(['Boston Celtics', 'Denver Nuggets'])).toBe(false);
    expect(isDateLadder(['December 31'])).toBe(false);
  });
});

describe('dateCheckReason', () => {
  it('flags a passed date, a closed market and an open date ladder', () => {
    expect(dateCheckReason('2026-11-01', '2026-11-25', odds(false, 'Yes', 'No'))).toBe('missed');
    expect(dateCheckReason('2026-11-01', '2026-11-25', odds(true, 'Yes', 'No'))).toBe('resolved');
    expect(dateCheckReason('2026-12-01', '2026-11-25', odds(false, 'December 15', 'December 31'))).toBe('ladder');
    expect(dateCheckReason('2026-12-01', '2026-11-25', odds(false, 'Yes', 'No'))).toBeNull();
    expect(dateCheckReason('2026-12-01', '2026-11-25', odds(true, 'Yes', 'No'))).toBeNull();
  });
});
