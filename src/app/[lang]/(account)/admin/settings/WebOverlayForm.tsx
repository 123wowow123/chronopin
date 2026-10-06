'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { WebOverlaySetting } from '@/lib/webOverlay';

// Whether the map offers its web of related-pin lines and graph. Off by
// default: it is a dense, exploratory view most visitors never reach for.
export function WebOverlayForm({ saved }: { saved: WebOverlaySetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<WebOverlaySetting>('/api/admin/web-overlay', { enabled });
      setCurrent(next);
      setMessage(next.enabled ? 'Saved. The map now offers the web toggle.' : 'Saved. The map no longer offers the web toggle.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Related-pin web on the map</h2>
      <p className="mt-1 text-sm text-subtle">
        On a wide screen, the map can draw lines between related pins and show a graph of them beside it. Off, neither the
        toggle nor the lines are offered at all.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="size-4 accent-accent"
        />
        Offer the web toggle on the map
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
