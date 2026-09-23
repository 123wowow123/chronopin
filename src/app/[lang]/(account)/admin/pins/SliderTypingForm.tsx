'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { SliderTypingSetting } from '@/lib/sliderTyping';

// Whether the filter sliders offer a typed box and preset chips under the
// track. Off by default: the track alone steps through every preset.
export function SliderTypingForm({ saved }: { saved: SliderTypingSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<SliderTypingSetting>('/api/admin/slider-typing', { enabled });
      setCurrent(next);
      setMessage(next.enabled ? 'Saved. The sliders now offer a typed box and presets.' : 'Saved. The sliders are now the track alone.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Typed values on the filter sliders</h2>
      <p className="mt-1 text-sm text-subtle">
        The posted within, distance and time span sliders on the timeline, search and map can show a box to type an exact
        value and a row of preset chips under the track. Off, they are the slider alone.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="size-4 accent-accent"
        />
        Show the typed box and presets
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
