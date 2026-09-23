import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { dailyJobsView } from '@/server/jobs/view';
import { AdminTabs } from '../AdminTabs';
import { DailyJobsPanel } from './DailyJobsPanel';
import { LintFindings } from './LintFindings';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin jobs' };

// The daily pin jobs (src/server/jobs, docs/okf/scraping/daily-jobs.md): when
// each runs, what it does, who reasons for it, and what the recent runs did -
// then the okf:lint findings that keep the pins in order (once a tab of its
// own, /admin/lint, which now sends here).
export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ check?: string; severity?: string }> }) {
  await requireAdminViewer('/admin/jobs');
  const [view, params] = await Promise.all([dailyJobsView(), searchParams]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/jobs" />
      <h1 className="sr-only">Jobs</h1>
      <DailyJobsPanel initial={view} />
      <LintFindings check={params.check} severity={params.severity} />
    </div>
  );
}
