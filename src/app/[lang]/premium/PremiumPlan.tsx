'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useLocale, useT } from '@/lib/client/i18n';

// Buy or manage the premium plan. Signed-out visitors go to sign in first;
// paying and managing happen on Stripe's pages.
export function PremiumPlan({
  active,
  adFreeActive,
  endsOn,
  cancelling,
  canManage,
  paid,
  bundlePaid,
  configured,
}: {
  active: boolean;
  // The $1 ad-free plan is on, so the bundle would charge for it twice.
  adFreeActive: boolean;
  endsOn: string | null;
  cancelling: boolean;
  // There is a Stripe customer to manage; a month paid with WeChat Pay has none.
  canManage: boolean;
  paid: boolean;
  bundlePaid: boolean;
  configured: boolean;
}) {
  const t = useT();
  const chinese = useLocale() === 'zh';
  const { status, user } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function go(path: '/api/premium/checkout' | '/api/premium/portal' | '/api/bundle/checkout', currency?: 'cny' | 'wechat') {
    setBusy(true);
    setError('');
    try {
      const { url } = await api.post<{ url: string }>(path, currency === 'wechat' ? { method: 'wechat' } : currency ? { currency } : {});
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
        {active && canManage ? (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void go('/api/premium/portal')}>
            {t('premium.manage')}
          </button>
        ) : null}
        {active && !canManage && chinese ? (
          <>
            <button type="button" className="btn btn-secondary" disabled={busy || !configured} onClick={() => void go('/api/premium/checkout', 'wechat')}>
              {t('premium.addMonthWechat')}
            </button>
            <p className="text-sm text-muted">{t('premium.wechatNote')}</p>
          </>
        ) : null}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>
    );
  }
  const signedOut = status === 'ready' && !user;
  return (
    <div className={`mx-auto max-w-xl space-y-3 text-center ${signedOut ? '' : 'surface rounded-2xl p-6'}`}>
      {paid ? <p className="surface p-4 text-success" role="status">{t(bundlePaid ? 'premium.bundleThanks' : 'premium.thanks')}</p> : null}
      {signedOut ? (
        <a className="btn btn-primary px-8 py-3 text-base shadow-md" href={authHrefHere('/login')}>{t('premium.signIn')}</a>
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
      {!signedOut && chinese ? (
        <>
          <button type="button" className="btn btn-secondary" disabled={busy || !configured} onClick={() => void go('/api/premium/checkout', 'wechat')}>
            {t('premium.goWechat')}
          </button>
          <p className="text-sm text-muted">{t('premium.wechatNote')}</p>
        </>
      ) : null}
      {!signedOut ? (
        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-sm text-muted">{t('premium.bundleSave')}</p>
          {adFreeActive ? (
            <p className="text-sm text-warning">{t('premium.bundleHave')}</p>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" disabled={busy || !configured} onClick={() => void go('/api/bundle/checkout')}>
                {t('premium.bundleGo')}
              </button>
              {chinese ? (
                <button type="button" className="btn btn-secondary" disabled={busy || !configured} onClick={() => void go('/api/bundle/checkout', 'cny')}>
                  {t('premium.bundleGoCny')}
                </button>
              ) : null}
              {chinese ? (
                <button type="button" className="btn btn-secondary" disabled={busy || !configured} onClick={() => void go('/api/bundle/checkout', 'wechat')}>
                  {t('premium.bundleGoWechat')}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
