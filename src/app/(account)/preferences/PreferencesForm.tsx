'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import { DEFAULT_SPAN, formatSpan, SPAN_OPTIONS } from '@/lib/postedSpan';

export function PreferencesForm({ userId, initial }: { userId: number; initial: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initial || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.put(`/api/users/${userId}/preferences`, { defaultFilterSpanPreference: value || null });
      await refreshSession();
      router.refresh();
      setMessage('Preferences saved.');
    } catch {
      setError('Could not save your preferences.');
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label htmlFor="span" className="mb-1 block font-semibold">
          Timeline filter default
        </label>
        <select id="span" value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded bg-black px-3 py-2 text-ink ring-1 ring-raised-2">
          <option value="">No preference ({formatSpan(DEFAULT_SPAN)})</option>
          {SPAN_OPTIONS.map((span) => (
            <option key={span} value={span}>
              {formatSpan(span)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-subtle">The span the timeline&apos;s “posted within” filter starts on.</p>
      </div>
      {message ? <p role="status" className="text-green-400">{message}</p> : null}
      {error ? <p role="alert" className="text-red-400">{error}</p> : null}
      <button type="submit" className="rounded bg-accent px-4 py-2 text-lg text-white">
        Save changes
      </button>
    </form>
  );
}
