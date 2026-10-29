'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useLocale, useT } from '@/lib/client/i18n';

// Buy or manage the premium plan. Signed-out visitors go to sign in first;
// paying and managing happen on Stripe's pages.
export function PremiumPlan({ active, endsOn, cancelling, paid, configured }: { active: boolean; endsOn: string | null; cancelling: boolean; paid: boolean; configured: boolean }) {
  const t = useT();
  const chinese = useLocale() === 'zh';
  const { status, user } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function go(path: string, currency?: 'cny') {
    setBusy(true);
    setError('');
    try {
      const { url } = await api.post<{ url: string }>(path, currency ? { currency } : {});
      window.location.assign(url);
    } catch {
      setError(t('premium.checkoutError'));
      setBusy(false);
    }
  }

  if (active || user?.premium) {
    return (
      <div className="surface mx-auto max-w-xl space-y-3 p-6 text-center" role="status">
        <p className="text-lg font-semibold">{user?.role === 'admin' && !active ? t('premium.onAdmin') : t('premium.on')}</p>
        {endsOn ? <p className="text-muted">{cancelling ? t('premium.ends', { date: endsOn }) : t('premium.renews', { date: endsOn })}</p> : null}
        {active ? (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void go('/api/premium/portal')}>
            {t('premium.manage')}
          </button>
        ) : null}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>
    );
  }
  const signedOut = status === 'ready' && !user;
  return (
    <div className="mx-auto max-w-xl space-y-3 text-center">
      {paid ? <p className="surface p-4 text-success" role="status">{t('premium.thanks')}</p> : null}
      {signedOut ? (
        <a className="btn btn-primary" href={authHrefHere('/login')}>{t('premium.signIn')}</a>
      ) : (
        <button type="button" className="btn btn-primary" disabled={busy || !configured} onClick={() => void go('/api/premium/checkout')}>
          {configured ? t('premium.go') : t('premium.soon')}
        </button>
      )}
      {!signedOut && chinese ? (
        <button type="button" className="btn btn-secondary" disabled={busy || !configured} onClick={() => void go('/api/premium/checkout', 'cny')}>
          {t('premium.goCny')}
        </button>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
