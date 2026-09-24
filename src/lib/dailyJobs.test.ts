import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_JOBS, dueSlot, groupTasks, nextRun, parseDailyJobs, TASK_GROUPS, TASK_IDS, TASKS, withDefaultJobs } from './dailyJobs';

const midnight = DEFAULT_DAILY_JOBS.jobs[0];
const news = DEFAULT_DAILY_JOBS.jobs[1];
const monthly = DEFAULT_DAILY_JOBS.jobs[2];

describe('parseDailyJobs', () => {
  it('accepts its own default: off, at the top limits', () => {
    expect(parseDailyJobs(DEFAULT_DAILY_JOBS)).toEqual({ setting: DEFAULT_DAILY_JOBS });
    expect(DEFAULT_DAILY_JOBS.jobs.every((j) => !j.enabled && j.maxUpdates === 250)).toBe(true);
    expect([midnight, news].every((j) => j.maxNewPins === 100 && j.dayOfMonth === null)).toBe(true);
  });

  it('ships the monthly re-check as updates only, on the 1st', () => {
    expect(monthly).toMatchObject({ id: 'monthly', dayOfMonth: 1, tasks: ['lowConfidence'], maxNewPins: 0 });
  });

  it('reads a job saved before monthly jobs as every day', () => {
    const { dayOfMonth: _, ...saved } = news;
    expect(parseDailyJobs({ jobs: [saved] })).toEqual({ setting: { jobs: [news] } });
  });

  it('adds default jobs a saved setting lacks, and keeps the saved ones', () => {
    const saved = { jobs: [{ ...midnight, enabled: true }] };
    expect(withDefaultJobs(saved).jobs.map((j) => j.id)).toEqual(['midnight', 'news', 'monthly']);
    expect(withDefaultJobs(saved).jobs[0].enabled).toBe(true);
    expect(withDefaultJobs(DEFAULT_DAILY_JOBS)).toBe(DEFAULT_DAILY_JOBS);
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
      { dayOfMonth: 0 },
      { dayOfMonth: 29 },
      { dayOfMonth: 1.5 },
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

describe('monthly jobs', () => {
  // 03:00 PDT on 1 October 2026 is 10:00Z.
  it('is due only on its day of the month', () => {
    expect(dueSlot(monthly, new Date('2026-10-01T10:05:00Z'))).toEqual({
      key: 'monthly@2026-10-01T03:00 America/Los_Angeles',
      at: new Date('2026-10-01T10:00:00Z'),
    });
    expect(dueSlot(monthly, new Date('2026-09-30T10:05:00Z'))).toBeNull();
    expect(dueSlot(monthly, new Date('2026-10-02T12:00:00Z'))).toBeNull();
  });

  it('waits a day for a missed slot rather than skip a month', () => {
    expect(dueSlot(monthly, new Date('2026-10-02T09:59:00Z'))?.key).toBe('monthly@2026-10-01T03:00 America/Los_Angeles');
    expect(dueSlot(monthly, new Date('2026-10-02T10:01:00Z'))).toBeNull();
  });

  it('runs next on its day of the next month, across a DST change', () => {
    expect(nextRun(monthly, new Date('2026-09-24T12:00:00Z'))).toEqual(new Date('2026-10-01T10:00:00Z'));
    // Summer time ends at 02:00 on 1 November, so that day's 03:00 is PST, 11:00Z.
    expect(nextRun(monthly, new Date('2026-10-01T10:05:00Z'))).toEqual(new Date('2026-11-01T11:00:00Z'));
    expect(nextRun({ ...monthly, dayOfMonth: 28 }, new Date('2027-01-29T00:00:00Z'))).toEqual(new Date('2027-02-28T11:00:00Z'));
  });
});

describe('nextRun', () => {
  it('is the next slot, tomorrow when today has none left', () => {
    expect(nextRun(news, new Date('2026-09-22T13:05:00Z'))).toEqual(new Date('2026-09-23T01:00:00Z'));
    expect(nextRun(news, new Date('2026-09-23T02:00:00Z'))).toEqual(new Date('2026-09-23T13:00:00Z'));
    expect(nextRun(midnight, new Date('2026-09-22T13:05:00Z'))).toEqual(new Date('2026-09-23T07:00:00Z'));
  });
});

describe('task groups', () => {
  it('lists every task under one group, in run order group by group', () => {
    expect(TASK_GROUPS.flatMap((g) => groupTasks(g.id))).toEqual(TASK_IDS);
    expect(TASK_IDS.every((id) => TASK_GROUPS.some((g) => g.id === TASKS[id].group))).toBe(true);
  });

  it('runs the two beats at midnight', () => {
    expect(midnight.tasks).toEqual(expect.arrayContaining(['fortune100', 'layoffs']));
    expect(groupTasks('beats', midnight.tasks)).toEqual(['fortune100', 'layoffs']);
    expect(groupTasks('beats', news.tasks)).toEqual([]);
  });

  it('scores new company pins last in the news job, and not at midnight', () => {
    expect(news.tasks.at(-1)).toBe('sentiment');
    expect(midnight.tasks).not.toContain('sentiment');
  });
});
