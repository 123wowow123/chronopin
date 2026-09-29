import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { runJob } from '@/server/jobs';
import { getDailyJobs } from '@/server/model/appSetting';
import JobRun from '@/server/model/jobRun';
import log from '@/server/util/log';

// Starts a daily job now, whatever its schedule says (and whether or not it
// is enabled). Answers at once; the run goes on in the server and shows on
// GET /api/admin/daily-jobs. One run at a time.
// POST /api/admin/daily-jobs/run { jobId, driver? }
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const { jobId, driver } = await readJson<Record<string, unknown>>(request);
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
