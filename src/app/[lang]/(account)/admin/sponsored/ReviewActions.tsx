'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useRouter } from '@/lib/client/navigation';

export function ReviewActions({ id, needsRefund }: { id: number; needsRefund: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      const result = await api.post<{ refunded?: boolean }>(`/api/admin/sponsored-ads/${id}`, body);
      if (result?.refunded === false) setMessage('Rejected. Stripe could not refund it; do that in the dashboard.');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setBusy(false);
    }
  }

  if (needsRefund) {
    return (
      <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => void act({ action: 'refunded' })}>
        Mark refunded
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className="btn btn-primary" onClick={() => void act({ action: 'approve' })}>
          Approve
        </button>
        <input className="field min-w-48 flex-1" placeholder="Reason, if rejecting" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Rejection reason" />
        <button type="button" disabled={busy || !reason.trim()} className="btn btn-secondary text-danger" onClick={() => void act({ action: 'reject', reason })}>
          Reject and refund
        </button>
      </div>
      {message ? <p className="text-sm text-warning" role="status">{message}</p> : null}
    </div>
  );
}
