import type { Metadata } from 'next';
import { requireAdminViewer } from '@/server/guard';
import { AdminTabs } from '../../AdminTabs';
import { JobsTabs } from '../JobsTabs';
import { LintFindings } from '../LintFindings';

// Reads the session, so it blocks per request (see ../../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin lint' };

// The okf:lint findings, a tab inside Jobs (?check=, ?severity= narrow them).
export default async function AdminLintPage({ searchParams }: { searchParams: Promise<{ check?: string; severity?: string }> }) {
  await requireAdminViewer('/admin/jobs/lint');
  const { check, severity } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/jobs" />
      <h1 className="sr-only">Lint</h1>
      <JobsTabs current="/admin/jobs/lint" />
      <LintFindings check={check} severity={severity} />
    </div>
  );
}
