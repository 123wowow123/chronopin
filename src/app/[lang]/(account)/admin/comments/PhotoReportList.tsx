'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { blobUrl } from '@/lib/appConfig';

export type ReportedPhoto = {
  photoId: number;
  pinId: number;
  pinTitle: string;
  pinHref: string;
  blobName: string;
  caption: string | null;
  authorName: string;
  utcCreatedDateTime: string;
  flags: number;
  reasons: Record<string, number>;
  notes: string[];
  // Hidden from readers: enough of them flagged it.
  hidden: boolean;
};

const REASON_LABELS: Record<string, string> = {
  wrong: 'Not this place or thing',
  inappropriate: 'Inappropriate',
  spam: 'Spam or advert',
  private: 'Person or private information',
  other: 'Something else',
};

const when = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

// Photos readers added to pins and others flagged (0171). Keep restores a
// hidden photo and closes its flags; Remove takes it down for good.
export function PhotoReportList({ initialReports }: { initialReports: ReportedPhoto[] }) {
  const [reports, setReports] = useState(initialReports);
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);

  async function act(report: ReportedPhoto, action: 'delete' | 'keep') {
    setBusy(report.photoId);
    setFailed(null);
    try {
      if (action === 'delete') await api.delete(`/api/pins/${report.pinId}/photos/${report.photoId}`);
      else await api.delete(`/api/admin/photo-reports/${report.photoId}`);
      setReports((list) => list.filter((r) => r.photoId !== report.photoId));
    } catch {
      setFailed(report.photoId);
    } finally {
      setBusy(null);
    }
  }

  if (!reports.length) {
    return <p className="surface px-4 py-6 text-center text-sm text-subtle">No flagged photos.</p>;
  }
  return (
    <ul className="surface divide-y divide-line">
      {reports.map((report) => (
        <li key={report.photoId} className="flex gap-3 px-4 py-3">
          <a href={blobUrl(report.blobName)} target="_blank" rel="noopener noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- a stored reader photo */}
            <img src={blobUrl(report.blobName)} alt={report.caption || ''} loading="lazy" className="size-24 rounded-lg object-cover" />
          </a>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-subtle">
              <span className="font-medium">{report.authorName}</span>
              <span>on</span>
              <Link href={report.pinHref} className="min-w-0 truncate">
                {report.pinTitle}
              </Link>
              <span>· {when.format(new Date(report.utcCreatedDateTime))}</span>
            </div>
            {report.caption ? <p className="text-sm break-words text-ink">{report.caption}</p> : null}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-danger">
                {report.flags} {report.flags === 1 ? 'flag' : 'flags'}
              </span>
              {report.hidden ? (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 font-medium text-danger ring-1 ring-danger/25 ring-inset" title="Hidden from readers until restored">
                  Hidden
                </span>
              ) : null}
              {Object.entries(report.reasons ?? {}).map(([reason, count]) => (
                <span key={reason} className="rounded-full bg-raised px-2 py-0.5 text-muted">
                  {REASON_LABELS[reason] ?? reason}
                  {count > 1 ? ` ×${count}` : ''}
                </span>
              ))}
            </div>
            {report.notes.length ? <p className="text-xs break-words text-subtle">“{report.notes.join('”, “')}”</p> : null}
            <div className="flex gap-2">
              <button type="button" disabled={busy === report.photoId} onClick={() => act(report, 'keep')} className="btn btn-sm btn-ghost">
                {report.hidden ? 'Restore' : 'Keep'}
              </button>
              <button
                type="button"
                disabled={busy === report.photoId}
                onClick={() => act(report, 'delete')}
                className="btn btn-sm btn-ghost text-danger hover:bg-red-500/10 hover:text-danger-soft"
              >
                Remove
              </button>
            </div>
            {failed === report.photoId ? <p className="text-xs text-danger">That did not go through. Try again.</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
