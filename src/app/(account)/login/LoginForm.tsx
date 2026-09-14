'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { OAuthButtons } from '@/components/forms/OAuthButtons';
import { api, ApiError } from '@/lib/client/api';

const inputClass = 'w-full rounded bg-black px-3 py-2 text-ink ring-1 ring-raised-2 focus:ring-link focus:outline-none';

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
      const redirect = params.get('redirect');
      // A full load: being signed in changes what every page shows, and the
      // router may still remember the redirect that sent us here.
      window.location.assign(redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-semibold">
          Password
        </label>
        <input id="password" type="password" autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error ? (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded bg-white px-4 py-2 text-lg text-black disabled:opacity-60">
          Login
        </button>
        <Link href="/signup" className="rounded bg-white px-4 py-2 text-lg text-black hover:no-underline">
          Register
        </Link>
      </div>
      <hr className="border-raised-2" />
      <OAuthButtons />
    </form>
  );
}
