'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import { DEFAULT_POSTED_WITHIN, formatSpan, SPAN_OPTIONS, spanLabel } from '@/lib/postedSpan';

// Saves as soon as a span is picked, like the theme switch beside it.
export function PreferencesForm({ userId, initial }: { userId: number; initial: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initial || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  // One save at a time: parallel PUTs can land out of order and store an older
  // pick. A pick made mid-save waits, and only the newest waiting one is sent.
  const saving = useRef(false);
  const pending = useRef<string | null>(null);

  async function choose(next: string) {
    setValue(next);
    setMessage('');
    setError('');
    pending.current = next;
    if (saving.current) return;
    saving.current = true;
    try {
      while (pending.current !== null) {
        const sending = pending.current;
        pending.current = null;
        await api.put(`/api/users/${userId}/preferences`, { defaultFilterSpanPreference: sending || null });
      }
      await refreshSession();
      router.refresh();
      setMessage('Preferences saved.');
    } catch {
      pending.current = null;
      setError('Could not save your preferences.');
    } finally {
      saving.current = false;
    }
  }

  return (
    <section className="surface space-y-3 p-6">
      <div>
        <label htmlFor="span" className="field-label">
          Timeline filter default
        </label>
        <select id="span" value={value} onChange={(e) => void choose(e.target.value)} className="field">
          <option value="">Default ({spanLabel(DEFAULT_POSTED_WITHIN)})</option>
          {SPAN_OPTIONS.map((span) => (
            <option key={span} value={span}>
              {formatSpan(span)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-subtle">The span the timeline&apos;s “posted within” filter starts on.</p>
      </div>
      {message ? <p role="status" className="text-sm text-success">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}
