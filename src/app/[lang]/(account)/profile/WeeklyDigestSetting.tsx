'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';

// The weekly "my timeline" email: what is coming up from the pins you watch
// and the companies and people you follow. Off until switched on; saves as
// soon as it is switched, like the reminder above it.
export function WeeklyDigestSetting({ userId, initial }: { userId: number; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = useT();

  async function change(next: boolean) {
    setOn(next);
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api.put(`/api/users/${userId}/preferences`, { weeklyDigest: next });
      setMessage(next ? t('profile.digestOn') : t('profile.digestOff'));
    } catch {
      setOn(!next);
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-3 p-6">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => void change(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
        <span>
          <span className="field-label block">{t('profile.digestLabel')}</span>
          <span className="block text-sm text-subtle">{t('profile.digestHint')}</span>
        </span>
      </label>
      {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
