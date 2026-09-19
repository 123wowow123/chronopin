'use client';

import { useRouter } from '@/lib/client/navigation';
import { useRef, useState } from 'react';
import { api } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import { DEFAULT_POSTED_WITHIN, formatSpan, SPAN_OPTIONS, spanLabel } from '@/lib/postedSpan';
import { useT } from '@/lib/client/i18n';

// Saves as soon as a span is picked, like the theme switch beside it.
export function PreferencesForm({ userId, initial }: { userId: number; initial: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initial || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = useT();
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
      setMessage(t('profile.preferencesSaved'));
    } catch {
      pending.current = null;
      setError(t('profile.preferencesFailed'));
    } finally {
      saving.current = false;
    }
  }

  return (
    <section className="surface space-y-3 p-6">
      <div>
        <label htmlFor="span" className="field-label">
          {t('profile.filterDefault')}
        </label>
        <select id="span" value={value} onChange={(e) => void choose(e.target.value)} className="field">
          <option value="">{t('profile.defaultSpan', { span: spanLabel(DEFAULT_POSTED_WITHIN, t.locale) })}</option>
          {SPAN_OPTIONS.map((span) => (
            <option key={span} value={span}>
              {formatSpan(span, t.locale)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-subtle">{t('profile.filterDefaultHint')}</p>
      </div>
      {message ? <p role="status" className="text-sm text-success">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}
