'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/client/navigation';
import { api } from '@/lib/client/api';
import type { SponsoredStatus } from '@/lib/sponsoredAds';

// What can be done with one ad: pay for or change one that is not paid yet,
// pause and resume a live one.
export function AdActions({ id, status }: { id: number; status: SponsoredStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  if (status === 'in_review' || status === 'completed') return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' ? (
        <>
          <button type="button" disabled={busy} className="btn btn-primary" onClick={() => run(async () => {
            const { url } = await api.post<{ url: string }>(`/api/advertise/ads/${id}/checkout`, {});
            window.location.assign(url);
          })}>
            Pay and submit
          </button>
          <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => router.push(`/profile/ads?edit=${id}`)}>
            Edit
          </button>
          <button type="button" disabled={busy} className="btn btn-ghost text-danger" onClick={() => run(async () => {
            await api.delete(`/api/advertise/ads/${id}`);
            router.refresh();
            setBusy(false);
          })}>
            Delete
          </button>
        </>
      ) : (
        <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => run(async () => {
          await api.patch(`/api/advertise/ads/${id}`, { paused: status === 'active' });
          router.refresh();
          setBusy(false);
        })}>
          {status === 'active' ? 'Pause' : 'Resume'}
        </button>
      )}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
