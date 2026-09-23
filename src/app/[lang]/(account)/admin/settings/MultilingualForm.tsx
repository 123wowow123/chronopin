'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { MultilingualSetting } from '@/lib/multilingual';

// Whether the site is offered in its other languages, or is English only
// (src/lib/multilingual.ts). Off by default.
export function MultilingualForm({ saved }: { saved: MultilingualSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<MultilingualSetting>('/api/admin/multilingual', { enabled });
      setCurrent(next);
      setMessage(next.enabled ? 'Saved. Visitors get their own language again.' : 'Saved. Every page is now English.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Other languages</h2>
      <p className="mt-1 text-sm text-subtle">
        The site can be read in Spanish, French, German, Japanese and Chinese, picked in a viewer&apos;s profile or from their browser&apos;s
        language. Off, every page is English: links to another language open the English page, the profile has no language picker, and new
        or edited pins are not translated. Stored translations and saved language choices are kept for turning it back on.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="size-4 accent-accent"
        />
        Offer the site in other languages
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
