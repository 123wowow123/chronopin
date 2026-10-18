'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { AutoTranslateSetting } from '@/lib/autoTranslate';

// Whether new and edited pins are translated automatically
// (src/lib/autoTranslate.ts). Off by default.
export function AutoTranslateForm({ saved }: { saved: AutoTranslateSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<AutoTranslateSetting>('/api/admin/auto-translate', { enabled });
      setCurrent(next);
      setMessage(
        next.enabled
          ? 'Saved. New and edited pins are translated into the offered languages.'
          : 'Saved. Pins are no longer translated automatically.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Automatic pin translation</h2>
      <p className="mt-1 text-sm text-subtle">
        On, a pin is translated by Claude into each offered language as soon as it is posted or edited. Off, nothing is translated on its own:
        a pin without a current translation shows in English until one is made by hand (Translations to make again, below).
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="size-4 accent-accent"
        />
        Translate new and edited pins automatically
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
