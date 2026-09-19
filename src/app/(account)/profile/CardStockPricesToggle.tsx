'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';

// Whether pin cards show the company's stock price in the company pill.
// Saves as soon as it is switched, like the theme above it.
export function CardStockPricesToggle({ userId, initial }: { userId: number; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function change(next: boolean) {
    setOn(next);
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api.put(`/api/users/${userId}/preferences`, { showCardStockPrices: next });
      await refreshSession();
      setMessage(next ? 'Cards show stock prices.' : 'Cards no longer show stock prices.');
    } catch {
      setOn(!next);
      setError('Could not save that. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-2 p-6">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => void change(e.target.checked)} className="mt-0.5 size-4 accent-accent" />
        <span>
          <span className="field-label block">Stock prices on pin cards</span>
          <span className="block text-sm text-subtle">
            The company&apos;s share price and its move since the start date, beside the company&apos;s name. A pin&apos;s own page always lists its
            stocks.
          </span>
        </span>
      </label>
      {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
