'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import { DEFAULT_POSTED_WITHIN, formatSpan, SPAN_OPTIONS, spanLabel } from '@/lib/postedSpan';

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
    <form onSubmit={save} className="surface space-y-4 p-6">
      <div>
        <label htmlFor="span" className="field-label">
          Timeline filter default
        </label>
        <select id="span" value={value} onChange={(e) => setValue(e.target.value)} className="field">
          <option value="">Default ({spanLabel(DEFAULT_POSTED_WITHIN)})</option>
          {SPAN_OPTIONS.map((span) => (
            <option key={span} value={span}>
              {formatSpan(span)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-subtle">The span the timeline&apos;s “posted within” filter starts on.</p>
      </div>
      {message ? <p role="status" className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <button type="submit" className="btn btn-primary">
        Save changes
      </button>
    </form>
  );
}
