import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { getWikiRecheck, getWikiRecheckLastRun } from '@/server/model/appSetting';
import { dailyJobsView } from '@/server/jobs/view';
import { AdminTabs } from '../AdminTabs';
import { DailyJobsPanel } from './DailyJobsPanel';
import { WikiRecheckForm } from './WikiRecheckForm';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin jobs' };

// The work the server does on a timer: the daily pin jobs (src/server/jobs,
// docs/okf/scraping/daily-jobs.md) - when each runs, what it does, who reasons
// for it, and what the recent runs did - and the nightly re-read of link wikis.
export default async function AdminJobsPage() {
  await requireAdminViewer('/admin/jobs');
  const [view, recheck, lastRecheck] = await Promise.all([dailyJobsView(), getWikiRecheck(), getWikiRecheckLastRun()]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/jobs" />
      <h1 className="sr-only">Jobs</h1>
      <DailyJobsPanel initial={view}>
        <WikiRecheckForm saved={recheck} lastRun={lastRecheck} />
      </DailyJobsPanel>
    </div>
  );
}
