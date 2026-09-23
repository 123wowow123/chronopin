import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { dailyJobsView } from '@/server/jobs/view';
import { AdminTabs } from '../AdminTabs';
import { DailyJobsPanel } from './DailyJobsPanel';
import { JobsTabs } from './JobsTabs';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin jobs' };

// The daily pin jobs (src/server/jobs, docs/okf/scraping/daily-jobs.md): when
// each runs, what it does, who reasons for it, and what the recent runs did.
// The lint findings are the tab's other half (./lint).
export default async function AdminJobsPage() {
  await requireAdminViewer('/admin/jobs');
  const view = await dailyJobsView();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/jobs" />
      <h1 className="sr-only">Jobs</h1>
      <JobsTabs current="/admin/jobs" />
      <DailyJobsPanel initial={view} />
    </div>
  );
}
