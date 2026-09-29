'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';

export type ReportedMessage = {
  messageId: number;
  // As reported, so an unsend does not hide it from here.
  body: string;
  senderName: string | null;
  reporterNames: string[];
  utcCreatedDateTime: string;
  reports: number;
  reasons: Record<string, number>;
  unsent: boolean;
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment or hate',
  misleading: 'Misleading',
  other: 'Something else',
};

const when = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

// Direct messages their recipients reported (0093). A chat is private, so
// only the reported message is shown, never the rest of the conversation.
export function MessageReportList({ initialReports }: { initialReports: ReportedMessage[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);

  async function dismiss(report: ReportedMessage) {
    setBusy(report.messageId);
    setFailed(null);
    try {
      await api.delete(`/api/admin/message-reports/${report.messageId}`);
      setReports((list) => list.filter((r) => r.messageId !== report.messageId));
    } catch {
      setFailed(report.messageId);
    } finally {
      setBusy(null);
    }
  }

  if (!reports.length) {
    return <p className="surface px-4 py-6 text-center text-sm text-subtle">No reported messages.</p>;
  }
  return (
    <ul className="surface divide-y divide-line">
      {reports.map((report) => (
        <li key={report.messageId} className="space-y-2 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-subtle">
            <span className="font-medium">{report.senderName ?? 'Unknown'}</span>
            <span>to {report.reporterNames.join(', ')}</span>
            <span>· {when.format(new Date(report.utcCreatedDateTime))}</span>
            {report.unsent ? <span className="italic">· since unsent</span> : null}
          </div>
          <p className="break-words whitespace-pre-wrap text-ink">{report.body}</p>
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
            <span className="ml-auto">
              <button type="button" disabled={busy === report.messageId} onClick={() => dismiss(report)} className="btn btn-sm btn-ghost">
                Dismiss
              </button>
            </span>
          </div>
          {failed === report.messageId ? <p className="text-xs text-danger">That did not go through. Try again.</p> : null}
        </li>
      ))}
    </ul>
  );
}
