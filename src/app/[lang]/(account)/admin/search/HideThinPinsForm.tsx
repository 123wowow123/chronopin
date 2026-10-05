'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { HideThinPinsSetting } from '@/lib/searchQuality';

// Whether thin pins say "noindex, follow" and leave the sitemap. On by
// default; the pins keep their pages either way.
export function HideThinPinsForm({ saved, thin }: { saved: HideThinPinsSetting; thin: number }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<HideThinPinsSetting>('/api/admin/hide-thin-pins', { enabled });
      setCurrent(next);
      setMessage(next.enabled ? `Saved. ${thin.toLocaleString()} thin pins now ask not to be indexed.` : 'Saved. Every pin is offered to search engines again.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Hide thin pins from search</h2>
      <p className="mt-1 text-sm text-subtle">
        A thin pin keeps its page and stays on the timeline, but tells search engines &ldquo;noindex, follow&rdquo; and is left out of the
        sitemap, so it does not count against the site. Judged on the English pin; every language&apos;s copy follows it.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="size-4 accent-accent"
        />
        Hide thin pins from search ({thin.toLocaleString()} now)
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
