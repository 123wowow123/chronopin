'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';

// The $1 a month plan that turns every ad off (src/server/model/adFreeSubscription.ts).
// Buying and managing both happen on Stripe's own pages: the API answers with
// the address and this sends the browser there. Coming back from checkout the
// webhook may be a moment behind, so `justPaid` says so instead of offering to
// buy again.
export function AdFreeSetting({
  active,
  endsOn,
  endedOn,
  canManage,
  justPaid,
}: {
  active: boolean;
  // The day an active plan stops, when it has been cancelled and will not renew.
  endsOn: string | null;
  // The day a cancelled plan's paid period ran out, once it has: ads are back.
  endedOn: string | null;
  canManage: boolean;
  justPaid: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = useT();

  async function go(path: '/api/billing/checkout' | '/api/billing/portal') {
    setBusy(true);
    setError('');
    try {
      const { url } = await api.post<{ url: string }>(path, {});
      window.location.assign(url);
    } catch {
      setError(t('profile.adFreeError'));
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-3 p-6">
      <div>
        <span className="field-label block">{t('profile.adFreeLabel')}</span>
        <span className="block text-sm text-subtle">{t('profile.adFreeHint')}</span>
      </div>
      {active ? <p className="text-sm text-success">{t('profile.adFreeActive')}</p> : null}
      {active && endsOn ? <p className="text-sm text-warning">{t('profile.adFreeEnds', { date: endsOn })}</p> : null}
      {!active && endedOn ? <p className="text-sm text-warning">{t('profile.adFreeEnded', { date: endedOn })}</p> : null}
      {!active && justPaid ? <p className="text-sm text-success" role="status">{t('profile.adFreeThanks')}</p> : null}
      {!active && !justPaid ? (
        <button type="button" disabled={busy} onClick={() => void go('/api/billing/checkout')} className="btn btn-primary">
          {endedOn ? t('profile.adFreeResubscribe') : t('profile.adFreeSubscribe')}
        </button>
      ) : null}
      {canManage ? (
        <button type="button" disabled={busy} onClick={() => void go('/api/billing/portal')} className="btn btn-secondary">
          {t('profile.adFreeManage')}
        </button>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
