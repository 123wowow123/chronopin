'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';

export type ReportedComment = {
  commentId: number;
  pinId: number;
  pinTitle: string;
  pinHref: string;
  text: string;
  authorName: string | null;
  utcCreatedDateTime: string;
  reports: number;
  reasons: Record<string, number>;
  lastReportedDateTime: string;
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment or hate',
  misleading: 'Misleading',
  other: 'Something else',
};

// UTC, as the other admin pages show days, so server and browser agree.
const when = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export function ReportList({ initialReports }: { initialReports: ReportedComment[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);

  async function act(report: ReportedComment, action: 'delete' | 'dismiss') {
    setBusy(report.commentId);
    setFailed(null);
    try {
      if (action === 'delete') await api.delete(`/api/pins/${report.pinId}/comment/${report.commentId}`);
      else await api.delete(`/api/admin/comment-reports/${report.commentId}`);
      setReports((list) => list.filter((r) => r.commentId !== report.commentId));
    } catch {
      setFailed(report.commentId);
    } finally {
      setBusy(null);
    }
  }

  if (!reports.length) {
    return <p className="surface px-4 py-6 text-center text-sm text-subtle">No reported comments.</p>;
  }
  return (
    <ul className="surface divide-y divide-line">
      {reports.map((report) => (
        <li key={report.commentId} className="space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-subtle">
            <span className="font-medium">{report.authorName ?? 'Unknown'}</span>
            <span>on</span>
            <Link href={report.pinHref} className="min-w-0 truncate">
              {report.pinTitle}
            </Link>
            <span>· {when.format(new Date(report.utcCreatedDateTime))}</span>
          </div>
          <p className="break-words whitespace-pre-wrap text-ink">{report.text}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-danger">
              {report.reports} {report.reports === 1 ? 'report' : 'reports'}
            </span>
            {Object.entries(report.reasons ?? {}).map(([reason, count]) => (
              <span key={reason} className="rounded-full bg-raised px-2 py-0.5 text-muted">
                {REASON_LABELS[reason] ?? reason}
                {count > 1 ? ` ×${count}` : ''}
              </span>
            ))}
            <span className="ml-auto flex gap-2">
              <button type="button" disabled={busy === report.commentId} onClick={() => act(report, 'dismiss')} className="btn btn-sm btn-ghost">
                Dismiss
              </button>
              <button
                type="button"
                disabled={busy === report.commentId}
                onClick={() => act(report, 'delete')}
                className="btn btn-sm btn-ghost text-danger hover:bg-red-500/10 hover:text-danger-soft"
              >
                Delete comment
              </button>
            </span>
          </div>
          {failed === report.commentId ? <p className="text-xs text-danger">That did not go through. Try again.</p> : null}
        </li>
      ))}
    </ul>
  );
}
