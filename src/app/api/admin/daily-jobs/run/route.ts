import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { runJob } from '@/server/jobs';
import { runAllJobs } from '@/server/jobs/fullRun';
import { getDailyJobs } from '@/server/model/appSetting';
import JobRun from '@/server/model/jobRun';
import log from '@/server/util/log';

// Starts a daily job now, whatever its schedule says (and whether or not it
// is enabled). Answers at once; the run goes on in the server and shows on
// GET /api/admin/daily-jobs. One run at a time.
// With { all: true } instead of a jobId, every job runs one after another
// (src/server/jobs/fullRun.ts), each as its own run.
// POST /api/admin/daily-jobs/run { jobId, driver? } | { all: true, driver? }
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const { jobId, driver, all } = await readJson<Record<string, unknown>>(request);
  if (all === true) {
    if (driver !== undefined && !['auto', 'api', 'session'].includes(driver as string)) throw new HttpError(400, '', { message: 'driver must be auto, api or session' });
    await JobRun.closeAbandoned();
    if (await JobRun.anyRunning()) throw new HttpError(409, '', { message: 'A job is already running; wait for it to finish.' });
    void runAllJobs({ trigger: 'manual', userId: admin.id, driver: driver as 'auto' | 'api' | 'session' | undefined }).catch((err) =>
      log.warn('full run failed to start:', (err as Error).message),
    );
    return json({ started: 'all' }, 202);
  }
  if (typeof jobId !== 'string' || !(await getDailyJobs()).jobs.some((j) => j.id === jobId)) {
    throw new HttpError(400, '', { message: 'jobId must be one of the configured jobs' });
  }
  if (driver !== undefined && !['auto', 'api', 'session'].includes(driver as string)) throw new HttpError(400, '', { message: 'driver must be auto, api or session' });
  await JobRun.closeAbandoned();
  if (await JobRun.anyRunning()) throw new HttpError(409, '', { message: 'A job is already running; wait for it to finish.' });
  void runJob(jobId, { trigger: 'manual', userId: admin.id, driver: driver as 'auto' | 'api' | 'session' | undefined }).catch((err) =>
    log.warn(`manual job ${jobId} failed to start:`, (err as Error).message),
  );
  return json({ started: jobId }, 202);
});
