import type { Metadata } from 'next';
import { pinPath } from '@/lib/seo';
import { toJson } from '@/lib/types';
import { requireAdminViewer } from '@/server/guard';
import Comment, { COMMENT_HIDE_REPORTS } from '@/server/model/comment';
import Message from '@/server/model/message';
import { AdminTabs } from '../AdminTabs';
import { MessageReportList, type ReportedMessage } from './MessageReportList';
import { ReportList, type ReportedComment } from './ReportList';

// Reads the session, so it blocks per request (see ../../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: 'Admin comments' };

// Comments readers reported (0074), most reported first: each is taken down
// or its reports dismissed from here. Reported direct messages (0093) below.
export default async function AdminCommentsPage() {
  await requireAdminViewer('/admin/comments');
  const [comments, messages] = await Promise.all([Comment.openReports(), Message.openReports()]);
  const reports = comments.map((r) => ({ ...r, pinHref: pinPath({ id: r.pinId, title: r.pinTitle }) }));
  return (
    <div className="px-4 py-6 sm:py-10 lg:px-8">
      <AdminTabs current="/admin/comments" />
      <h1 className="sr-only">Comments</h1>
      <p className="mb-6 text-sm text-subtle">Comments readers reported. Remove one to take it down, or dismiss its reports to keep it. At {COMMENT_HIDE_REPORTS} reports a comment is hidden from readers until you dismiss them.</p>
      <ReportList initialReports={toJson<ReportedComment[]>(reports)} />
      <h2 className="mt-10 mb-2 text-lg font-semibold text-ink">Messages</h2>
      <p className="mb-4 text-sm text-subtle">Direct messages their recipients reported, as they read when reported. Only the reported message is shown, not the chat.</p>
      <MessageReportList initialReports={toJson<ReportedMessage[]>(messages)} />
    </div>
  );
}
