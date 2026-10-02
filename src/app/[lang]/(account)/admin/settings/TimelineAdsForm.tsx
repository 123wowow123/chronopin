'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { TimelineAdsSetting } from '@/lib/timelineAds';

// Whether the main timeline shows ad blocks. Off by default; the pin page's
// ads are unaffected.
export function TimelineAdsForm({ saved }: { saved: TimelineAdsSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<TimelineAdsSetting>('/api/admin/timeline-ads', { enabled });
      setCurrent(next);
      setMessage(next.enabled ? 'Saved. The timeline now shows ads.' : 'Saved. The timeline shows no ads.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Ads on the timeline</h2>
      <p className="mt-1 text-sm text-subtle">
        The main timeline can show an ad row between days and an ad panel under &ldquo;New pins&rdquo;. Off, it shows none.
        The ads on a pin&apos;s own page are not affected.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="size-4 accent-accent"
        />
        Show ads on the timeline
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
