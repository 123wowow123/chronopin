import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_JOBS, dueSlot, nextRun, parseDailyJobs } from './dailyJobs';

const midnight = DEFAULT_DAILY_JOBS.jobs[0];
const news = DEFAULT_DAILY_JOBS.jobs[1];

describe('parseDailyJobs', () => {
  it('accepts its own default: on, at the top limits', () => {
    expect(parseDailyJobs(DEFAULT_DAILY_JOBS)).toEqual({ setting: DEFAULT_DAILY_JOBS });
    expect(DEFAULT_DAILY_JOBS.jobs.every((j) => j.enabled && j.maxNewPins === 100 && j.maxUpdates === 250)).toBe(true);
  });

  it('sorts and de-duplicates times and keeps tasks in catalogue order', () => {
    const parsed = parseDailyJobs({ jobs: [{ ...news, times: ['18:00', '06:00', '18:00'], tasks: ['breakingNews', 'weekReview'] }] });
    expect(parsed).toEqual({ setting: { jobs: [{ ...news, times: ['06:00', '18:00'], tasks: ['weekReview', 'breakingNews'] }] } });
  });

  it('rejects bad values', () => {
    for (const patch of [
      { times: ['24:00'] },
      { times: [] },
      { timeZone: 'Mars/Olympus' },
      { tasks: ['nope'] },
      { tasks: [] },
      { driver: 'gpt' },
      { maxNewPins: 101 },
      { maxUpdates: 251 },
      { maxUpdates: -1 },
      { id: 'Has Space' },
      { enabled: 'yes' },
    ]) {
      expect(parseDailyJobs({ jobs: [{ ...news, ...patch }] })).toHaveProperty('problem');
    }
    expect(parseDailyJobs({ jobs: [news, news] })).toHaveProperty('problem');
    expect(parseDailyJobs(null)).toHaveProperty('problem');
  });
});

describe('dueSlot', () => {
  // 2026-09-22 is in Pacific Daylight Time (UTC-7).
  it('is the local time just passed', () => {
    const slot = dueSlot(news, new Date('2026-09-22T13:05:00Z'));
    expect(slot).toEqual({ key: 'news@2026-09-22T06:00 America/Los_Angeles', at: new Date('2026-09-22T13:00:00Z') });
  });

  it('catches up a missed slot for two hours, then lets it go', () => {
    expect(dueSlot(news, new Date('2026-09-22T14:59:00Z'))?.key).toBe('news@2026-09-22T06:00 America/Los_Angeles');
    expect(dueSlot(news, new Date('2026-09-22T15:01:00Z'))).toBeNull();
  });

  it('finds midnight from just after it, as the new local day', () => {
    expect(dueSlot(midnight, new Date('2026-09-23T07:10:00Z'))?.key).toBe('midnight@2026-09-23T00:00 America/Los_Angeles');
  });

  it("reaches back into yesterday for last evening's slot", () => {
    // 00:30 local on the 23rd: yesterday's 18:00 is 6.5 hours gone.
    expect(dueSlot(news, new Date('2026-09-23T07:30:00Z'))).toBeNull();
    // 19:00 local on the 22nd is 02:00Z on the 23rd.
    expect(dueSlot(news, new Date('2026-09-23T02:00:00Z'))?.key).toBe('news@2026-09-22T18:00 America/Los_Angeles');
  });

  it('follows the zone across a DST change', () => {
    // 2026-11-01 falls back: 06:00 PST is 14:00Z.
    expect(dueSlot(news, new Date('2026-11-01T14:01:00Z'))?.at).toEqual(new Date('2026-11-01T14:00:00Z'));
  });
});

describe('nextRun', () => {
  it('is the next slot, tomorrow when today has none left', () => {
    expect(nextRun(news, new Date('2026-09-22T13:05:00Z'))).toEqual(new Date('2026-09-23T01:00:00Z'));
    expect(nextRun(news, new Date('2026-09-23T02:00:00Z'))).toEqual(new Date('2026-09-23T13:00:00Z'));
    expect(nextRun(midnight, new Date('2026-09-22T13:05:00Z'))).toEqual(new Date('2026-09-23T07:00:00Z'));
  });
});
