'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/client/navigation';
import { api } from '@/lib/client/api';
import { useLocale } from '@/lib/client/i18n';
import type { SponsoredStatus } from '@/lib/sponsoredAds';

// What can be done with one ad: pay for or change one that is not paid yet,
// pause and resume a live one.
export function AdActions({ id, status, dailyLimit, monthly = false }: { id: number; status: SponsoredStatus; dailyLimit: number | null; monthly?: boolean }) {
  const router = useRouter();
  const chinese = useLocale() === 'zh';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(dailyLimit == null ? '' : String(dailyLimit));

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

  const manage = monthly && status !== 'draft' && status !== 'in_review' ? (
    <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => run(async () => {
      const { url } = await api.post<{ url: string }>(`/api/advertise/ads/${id}/portal`, {});
      window.location.assign(url);
    })}>
      Manage subscription
    </button>
  ) : null;
  if (status === 'in_review') return null;
  if (status === 'completed') return manage ? <div className="flex flex-wrap items-center gap-2">{manage}</div> : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' ? (
        <>
          <button type="button" disabled={busy} className="btn btn-primary" onClick={() => run(async () => {
            const { url } = await api.post<{ url: string }>(`/api/advertise/ads/${id}/checkout`, {});
            window.location.assign(url);
          })}>
            {monthly ? 'Subscribe and submit' : 'Pay and submit'}
          </button>
          {chinese ? (
            <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => run(async () => {
              const { url } = await api.post<{ url: string }>(`/api/advertise/ads/${id}/checkout`, { method: 'wechat' });
              window.location.assign(url);
            })}>
              {monthly ? '微信支付一个月并提交' : '微信支付并提交'}
            </button>
          ) : null}
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
      {manage}
      <div className="flex flex-1 items-center gap-2">
        <label className="text-sm text-subtle" htmlFor={`daily-${id}`}>Max impressions per day</label>
        <input
          id={`daily-${id}`}
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="No limit"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="input w-28"
        />
        <button type="button" disabled={busy || limit === (dailyLimit == null ? '' : String(dailyLimit))} className="btn btn-secondary ml-auto" onClick={() => run(async () => {
          await api.patch(`/api/advertise/ads/${id}`, { dailyLimit: limit.trim() === '' ? null : Number(limit) });
          router.refresh();
          setBusy(false);
        })}>
          Save
        </button>
      </div>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
