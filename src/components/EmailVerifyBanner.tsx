'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';

const HIDDEN_KEY = 'emailVerifyBannerHidden';

function hiddenFor(): string | null {
  try {
    return sessionStorage.getItem(HIDDEN_KEY);
  } catch {
    return null;
  }
}

// A slim strip hanging under the navbar while the signed-in account's email is
// unconfirmed (0071): posting waits for the link, and this is where to ask
// for it again. Part of the sticky header, since the timeline scrolls to today
// on load and would carry anything in the page's flow out of sight; laid over
// the page rather than making the header taller, since the map, the tag cloud
// and the sticky sort bar all measure from its 52px. Hiding it lasts for the
// tab's session, for that account.
export function EmailVerifyBanner() {
  const { user } = useSession();
  const t = useT();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'tooSoon' | 'failed'>('idle');
  const [hidden, setHidden] = useState(() => (typeof window === 'undefined' ? null : hiddenFor()));

  if (!user || user.emailVerifiedDateTime || hidden === String(user.id)) return null;

  async function resend() {
    setState('sending');
    try {
      await api.post('/api/users/me/verification');
      setState('sent');
    } catch (err) {
      setState(err instanceof ApiError && err.status === 429 ? 'tooSoon' : 'failed');
    }
  }

  function hide() {
    try {
      sessionStorage.setItem(HIDDEN_KEY, String(user!.id));
    } catch {
      // Hidden until the next page load, then.
    }
    setHidden(String(user!.id));
  }

  return (
    <div className="absolute inset-x-0 top-full flex items-center gap-2 bg-raised px-3 py-1 text-xs shadow-[0_1px_0_var(--color-line)] sm:px-5 sm:text-sm">
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-center">
        <span className="text-ink sm:hidden">{t('verifyEmail.bannerShort')}</span>
        <span className="text-ink max-sm:hidden">{t('verifyEmail.banner', { email: user.email ?? '' })}</span>
        {state === 'sent' ? (
          <span className="text-success">{t('verifyEmail.sent')}</span>
        ) : state === 'tooSoon' ? (
          <span className="text-subtle">{t('verifyEmail.tooSoon')}</span>
        ) : (
          <button type="button" className="font-medium text-link hover:underline disabled:opacity-60" onClick={resend} disabled={state === 'sending'}>
            {state === 'sending' ? t('verifyEmail.sending') : t('verifyEmail.resend')}
          </button>
        )}
        {state === 'failed' ? <span className="text-danger">{t('common.somethingWrong')}</span> : null}
      </div>
      <button type="button" aria-label={t('verifyEmail.hide')} title={t('verifyEmail.hide')} className="shrink-0 rounded px-1.5 text-base leading-none text-subtle hover:text-ink" onClick={hide}>
        ×
      </button>
    </div>
  );
}
