'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import { useT } from '@/lib/client/i18n';

// Whether pin cards show the company's stock price in the company pill.
// Saves as soon as it is switched, like the theme above it.
export function CardStockPricesToggle({ userId, initial }: { userId: number; initial: boolean }) {
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
      await api.put(`/api/users/${userId}/preferences`, { showCardStockPrices: next });
      await refreshSession();
      setMessage(next ? t('profile.stocksOn') : t('profile.stocksOff'));
    } catch {
      setOn(!next);
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-2 p-6">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => void change(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
        <span>
          <span className="field-label block">{t('profile.stocksLabel')}</span>
          <span className="block text-sm text-subtle">{t('profile.stocksHint')}</span>
        </span>
      </label>
      {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
