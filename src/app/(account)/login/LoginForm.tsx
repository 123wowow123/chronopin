'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { OAuthButtons, OrDivider } from '@/components/forms/OAuthButtons';
import { afterLoginPath, authHref } from '@/lib/authRedirect';
import { api, ApiError } from '@/lib/client/api';


export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) return setError('Please enter your email and password.');
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/local', { email, password });
      // A full load: being signed in changes what every page shows, and the
      // router may still remember the redirect that sent us here.
      window.location.assign(afterLoginPath(params.get('redirect')));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-danger-soft ring-1 ring-red-500/20 ring-inset">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
        {busy ? 'Logging in…' : 'Login'}
      </button>
      <OrDivider />
      <OAuthButtons redirect={afterLoginPath(params.get('redirect'))} />
      <p className="pt-2 text-center text-sm text-subtle">
        New to Chronopin? <Link href={authHref('/signup', params.get('redirect'))} className="underline decoration-link/40 underline-offset-2 hover:decoration-link">Create an account</Link>
      </p>
    </form>
  );
}
