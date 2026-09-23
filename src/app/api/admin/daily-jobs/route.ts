import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { dailyJobsView } from '@/server/jobs/view';
import { setDailyJobs } from '@/server/model/appSetting';
import { parseDailyJobs } from '@/lib/dailyJobs';

// The daily pin jobs (src/server/jobs): when each runs and what it does, the
// recent runs, and which drivers this server has. Admin only.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await dailyJobsView());
});

// PUT /api/admin/daily-jobs { jobs: [...] } - the whole setting.
export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseDailyJobs(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setDailyJobs(parsed.setting, admin.id);
  return json(await dailyJobsView());
});
