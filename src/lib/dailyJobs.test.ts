import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_JOBS, dueSlot, groupTasks, nextRun, parseDailyJobs, TASK_GROUPS, TASK_IDS, TASKS, withDefaultJobs } from './dailyJobs';

const midnight = DEFAULT_DAILY_JOBS.jobs[0];
const news = DEFAULT_DAILY_JOBS.jobs[1];
const monthly = DEFAULT_DAILY_JOBS.jobs[2];
const weekly = DEFAULT_DAILY_JOBS.jobs[3];

describe('parseDailyJobs', () => {
  it('accepts its own default: off, at the top limits', () => {
    expect(parseDailyJobs(DEFAULT_DAILY_JOBS)).toEqual({ setting: DEFAULT_DAILY_JOBS });
    expect(DEFAULT_DAILY_JOBS.jobs.every((j) => !j.enabled && j.maxUpdates === (j.id === 'weekly' ? 100 : 250))).toBe(true);
    expect([midnight, news].every((j) => j.maxNewPins === 100 && j.dayOfMonth === null)).toBe(true);
  });

  it('ships the monthly re-check as updates only, on the 1st', () => {
    expect(monthly).toMatchObject({ id: 'monthly', dayOfMonth: 1, tasks: ['lowConfidence'], maxNewPins: 0 });
  });

  it('ships the products refresh weekly, on Monday, as updates only', () => {
    expect(weekly).toMatchObject({ id: 'weekly', dayOfWeek: 1, dayOfMonth: null, tasks: ['products'], maxNewPins: 0 });
  });

  it('refuses a job with both a day of the week and a day of the month', () => {
    expect(parseDailyJobs({ jobs: [{ ...weekly, dayOfMonth: 3 }] })).toHaveProperty('problem');
    expect(parseDailyJobs({ jobs: [{ ...weekly, dayOfWeek: 7 }] })).toHaveProperty('problem');
  });

  it('runs a weekly job only on its weekday, and waits a day for a missed slot', () => {
    // Monday 2026-10-12 04:00 PDT is 11:00Z.
    expect(dueSlot(weekly, new Date('2026-10-12T11:30:00Z'))?.key).toBe('weekly@2026-10-12T04:00 America/Los_Angeles');
    expect(dueSlot(weekly, new Date('2026-10-13T10:00:00Z'))?.key).toBe('weekly@2026-10-12T04:00 America/Los_Angeles');
    expect(dueSlot(weekly, new Date('2026-10-13T12:00:00Z'))).toBeNull();
    expect(nextRun(weekly, new Date('2026-10-08T12:00:00Z'))).toEqual(new Date('2026-10-12T11:00:00Z'));
    expect(nextRun(weekly, new Date('2026-10-12T11:05:00Z'))).toEqual(new Date('2026-10-19T11:00:00Z'));
  });

  it('reads a job saved before monthly jobs as every day', () => {
    const { dayOfMonth: _, dayOfWeek: __, ...saved } = news;
    expect(parseDailyJobs({ jobs: [saved] })).toEqual({ setting: { jobs: [news] } });
  });

  it('adds default jobs a saved setting lacks, and keeps the saved ones', () => {
    const saved = { jobs: [{ ...midnight, enabled: true }] };
    expect(withDefaultJobs(saved).jobs.map((j) => j.id)).toEqual(['midnight', 'news', 'monthly', 'weekly']);
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

  it('runs both beats at midnight and layoffs in the twice-daily news job', () => {
    expect(midnight.tasks).toEqual(expect.arrayContaining(['fortune100', 'layoffs']));
    expect(groupTasks('beats', midnight.tasks)).toEqual(['fortune100', 'layoffs']);
    expect(groupTasks('beats', news.tasks)).toEqual(['layoffs', 'hiringJobCreation']);
  });

  it('scores new company pins last in the news job, and not at midnight', () => {
    expect(news.tasks.at(-1)).toBe('sentiment');
    expect(midnight.tasks).not.toContain('sentiment');
  });

  it('runs threadPredicted in the news job upkeep', () => {
    expect(TASKS.threadPredicted.group).toBe('upkeep');
    expect(news.tasks).toContain('threadPredicted');
    expect(groupTasks('upkeep', news.tasks)).toContain('threadPredicted');
  });
});


describe('productLifecycle task', () => {
  it('runs in the news job upkeep', () => {
    expect(TASKS.productLifecycle.group).toBe('upkeep');
    expect(news.tasks).toContain('productLifecycle');
    expect(midnight.tasks).not.toContain('productLifecycle');
  });
});

describe('ad translation task', () => {
  it('runs inside midnight and the 6am/6pm news job without a separate job', () => {
    expect(midnight.tasks).toContain('adTranslations');
    expect(news.tasks).toContain('adTranslations');
    expect(midnight.times).toEqual(['00:00']);
    expect(news.times).toEqual(['06:00', '18:00']);
    expect(DEFAULT_DAILY_JOBS.jobs.some((j) => j.id === 'ad-translations')).toBe(false);
    expect(TASKS.adTranslations.group).toBe('upkeep');
  });
  it('upgrades saved settings, removes the standalone job and preserves schedules', () => {
    const oldMidnight = { ...midnight, enabled: true, tasks: midnight.tasks.filter((task) => task !== 'adTranslations') };
    const oldNews = { ...news, tasks: news.tasks.filter((task) => task !== 'adTranslations') };
    const setting = withDefaultJobs({ jobs: [oldMidnight, oldNews, monthly, weekly, { ...news, id: 'ad-translations', tasks: ['adTranslations'] }] });
    expect(setting.jobs.map((j) => j.id)).toEqual(['midnight', 'news', 'monthly', 'weekly']);
    for (const id of ['midnight', 'news']) expect(setting.jobs.find((j) => j.id === id)!.tasks.filter((task) => task === 'adTranslations')).toHaveLength(1);
    expect(setting.jobs[0].enabled).toBe(true);
    expect(setting.jobs[1].times).toEqual(oldNews.times);
    expect(withDefaultJobs(setting)).toBe(setting);
  });
});


describe('twice-daily layoff research', () => {
  it('adds layoffs to saved news jobs without changing their other settings', () => {
    const savedNews = { ...news, enabled: true, driver: 'session' as const, maxNewPins: 23, maxUpdates: 47, tasks: news.tasks.filter((task) => task !== 'layoffs') };
    const saved = { jobs: [midnight, savedNews, monthly, weekly] };
    const upgraded = withDefaultJobs(saved);
    expect(upgraded.jobs[1]).toEqual({ ...savedNews, tasks: news.tasks });
    expect(upgraded.jobs[1].times).toEqual(['06:00', '18:00']);
    expect(upgraded.jobs[0]).toBe(midnight);
    expect(savedNews.tasks).not.toContain('layoffs');
    expect(withDefaultJobs(upgraded)).toBe(upgraded);
  });
});


describe('twice-daily hiring and job creation research', () => {
  it('upgrades a saved news job predating both employment beats and preserves its configuration', () => {
    const oldNews = { ...news, enabled: true, driver: 'session' as const, maxNewPins: 17, maxUpdates: 63, tasks: news.tasks.filter((task) => task !== 'layoffs' && task !== 'hiringJobCreation') };
    const custom = { ...midnight, id: 'custom', tasks: ['breakingNews'] as typeof midnight.tasks };
    const saved = { jobs: [midnight, oldNews, monthly, weekly, custom] };
    const upgraded = withDefaultJobs(saved);
    expect(upgraded.jobs[1]).toEqual({ ...oldNews, tasks: news.tasks });
    expect(upgraded.jobs[0]).toBe(midnight);
    expect(upgraded.jobs[4]).toBe(custom);
    expect(oldNews.tasks).not.toContain('hiringJobCreation');
    expect(withDefaultJobs(upgraded)).toBe(upgraded);
    expect(news.times).toEqual(['06:00', '18:00']);
    expect(groupTasks('beats', news.tasks)).toEqual(['layoffs', 'hiringJobCreation']);
    expect(news.tasks.at(-1)).toBe('sentiment');
  });
});
