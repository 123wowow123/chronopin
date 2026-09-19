'use client';

import Link from '@/components/ui/Link';
import { useSearchParams } from '@/lib/client/navigation';
import { useState } from 'react';
import { OAuthButtons, OrDivider } from '@/components/forms/OAuthButtons';
import { afterLoginPath, authHref } from '@/lib/authRedirect';
import { api, ApiError } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useLocalize } from '@/lib/client/navigation';


export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();
  const localize = useLocalize();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) return setError(t('account.enterEmailPassword'));
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/local', { email, password });
      // A full load: being signed in changes what every page shows, and the
      // router may still remember the redirect that sent us here.
      window.location.assign(localize(afterLoginPath(params.get('redirect'))));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWrong'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="field-label">
          {t('account.email')}
        </label>
        <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          {t('account.password')}
        </label>
        <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-danger-soft ring-1 ring-red-500/20 ring-inset">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
        {busy ? t('account.loggingIn') : t('account.login')}
      </button>
      <OrDivider />
      <OAuthButtons redirect={afterLoginPath(params.get('redirect'))} />
      <p className="pt-2 text-center text-sm text-subtle">
        {t.rich('account.newTo', {
          link: (chunks) => (
            <Link href={authHref('/signup', params.get('redirect'))} className="underline decoration-link/40 underline-offset-2 hover:decoration-link">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
