import { nextRun, type DailyJobsSetting } from '@/lib/dailyJobs';
import { getClient } from '../extract';
import { getDailyJobs } from '../model/appSetting';
import JobRun, { type JobRunRow } from '../model/jobRun';
import PinRevisit from '../model/pinRevisit';
import { findClaudeBinary } from './drivers/session';

// What the admin page shows about the daily jobs, for GET
// /api/admin/daily-jobs and the page's first render.

export type JobRunView = Omit<JobRunRow, 'utcStartedDateTime' | 'utcFinishedDateTime'> & { started: string; finished: string | null };

export type DailyJobsView = {
  setting: DailyJobsSetting;
  runs: JobRunView[];
  nextRuns: Record<string, string>;
  // Which reasoning each driver would use on this server right now.
  drivers: { api: boolean; session: string | null };
  openRevisits: number;
};

export async function dailyJobsView(now = new Date()): Promise<DailyJobsView> {
  await JobRun.closeAbandoned();
  const [setting, runs, openRevisits] = await Promise.all([getDailyJobs(), JobRun.list(25), PinRevisit.countOpen()]);
  return {
    setting,
    runs: runs.map(({ utcStartedDateTime, utcFinishedDateTime, ...run }) => ({
      ...run,
      started: new Date(utcStartedDateTime).toISOString(),
      finished: utcFinishedDateTime ? new Date(utcFinishedDateTime).toISOString() : null,
    })),
    nextRuns: Object.fromEntries(setting.jobs.map((job) => [job.id, nextRun(job, now).toISOString()])),
    drivers: { api: !!getClient(), session: findClaudeBinary() },
    openRevisits,
  };
}
