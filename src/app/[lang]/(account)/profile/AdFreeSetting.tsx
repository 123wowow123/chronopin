'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useLocale, useT } from '@/lib/client/i18n';

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
  prepaid,
  justPaid,
}: {
  active: boolean;
  // The day an active plan stops, when it has been cancelled and will not renew.
  endsOn: string | null;
  // The day a cancelled plan's paid period ran out, once it has: ads are back.
  endedOn: string | null;
  canManage: boolean;
  // The plan is a month paid once with WeChat Pay: another month can be added.
  prepaid: boolean;
  justPaid: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = useT();
  const chinese = useLocale() === 'zh';

  async function go(path: '/api/billing/checkout' | '/api/billing/portal', currency?: 'cny' | 'wechat') {
    setBusy(true);
    setError('');
    try {
      const { url } = await api.post<{ url: string }>(path, currency === 'wechat' ? { method: 'wechat' } : currency ? { currency } : {});
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
      {!active && !justPaid && chinese ? (
        <button type="button" disabled={busy} onClick={() => void go('/api/billing/checkout', 'cny')} className="btn btn-secondary">
          {t('profile.adFreeSubscribeCny')}
        </button>
      ) : null}
      {chinese && ((!active && !justPaid) || prepaid) ? (
        <>
          <button type="button" disabled={busy} onClick={() => void go('/api/billing/checkout', 'wechat')} className="btn btn-secondary">
            {t('profile.adFreeSubscribeWechat')}
          </button>
          <p className="text-sm text-subtle">{t('premium.wechatNote')}</p>
        </>
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
