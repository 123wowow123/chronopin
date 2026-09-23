import type { Metadata } from 'next';
import { pinPath } from '@/lib/seo';
import { toJson } from '@/lib/types';
import { requireAdminViewer } from '@/server/guard';
import Comment, { COMMENT_HIDE_REPORTS } from '@/server/model/comment';
import { AdminTabs } from '../AdminTabs';
import { ReportList, type ReportedComment } from './ReportList';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin reports' };

// Comments readers reported (0074), most reported first: each is taken down
// or its reports dismissed from here.
export default async function AdminReportsPage() {
  await requireAdminViewer('/admin/reports');
  const reports = (await Comment.openReports()).map((r) => ({ ...r, pinHref: pinPath({ id: r.pinId, title: r.pinTitle }) }));
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <AdminTabs current="/admin/reports" />
      <h1 className="sr-only">Reports</h1>
      <p className="mb-6 text-sm text-subtle">Comments readers reported. Remove one to take it down, or dismiss its reports to keep it. At {COMMENT_HIDE_REPORTS} reports a comment is hidden from readers until you dismiss them.</p>
      <ReportList initialReports={toJson<ReportedComment[]>(reports)} />
    </div>
  );
}
