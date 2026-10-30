import { describe, expect, it } from 'vitest';
import { digestWeekStart, dueDigestWeek, parseWeeklyDigest } from './weeklyDigest';

describe('weekly digest clock', () => {
  it('names the Monday of a date', () => {
    expect(digestWeekStart(new Date('2026-10-29T10:00:00Z'))).toBe('2026-10-26');
    expect(digestWeekStart(new Date('2026-10-26T00:00:00Z'))).toBe('2026-10-26');
    expect(digestWeekStart(new Date('2026-11-01T23:59:00Z'))).toBe('2026-10-26');
  });
  it('is due Monday from 13:00 UTC for a day', () => {
    expect(dueDigestWeek(new Date('2026-10-26T12:59:00Z'))).toBeNull();
    expect(dueDigestWeek(new Date('2026-10-26T13:00:00Z'))).toBe('2026-10-26');
    expect(dueDigestWeek(new Date('2026-10-27T12:59:00Z'))).toBe('2026-10-26');
    expect(dueDigestWeek(new Date('2026-10-27T13:00:00Z'))).toBeNull();
    expect(dueDigestWeek(new Date('2026-10-29T13:00:00Z'))).toBeNull();
  });
  it('parses the switch', () => {
    expect(parseWeeklyDigest({ enabled: true })).toEqual({ setting: { enabled: true } });
    expect('problem' in parseWeeklyDigest({ enabled: 'yes' })).toBe(true);
  });
});
