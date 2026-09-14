'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OAuthButtons } from '@/components/forms/OAuthButtons';
import { api, ApiError } from '@/lib/client/api';

const inputClass = 'w-full rounded bg-black px-3 py-2 text-ink ring-1 ring-raised-2 focus:ring-link focus:outline-none';
const HANDLE = /^[a-zA-Z0-9-_]+$/;

export function SignupForm() {
  const [form, setForm] = useState({ handle: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  // The last availability answer, for the handle it was about.
  const [check, setCheck] = useState<{ handle: string; available: boolean } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleValid = !!form.handle && form.handle.length <= 15 && HANDLE.test(form.handle);
  const available = check && check.handle === form.handle ? check.available : null;

  useEffect(() => {
    if (!handleValid) return;
    const handle = form.handle;
    const timer = setTimeout(() => {
      api
        .post<{ available: boolean }>('/api/users/handle/check', { handle: `@${handle}` })
        .then((res) => setCheck({ handle, available: res.available }))
        .catch(() => setCheck(null));
    }, 150);
    return () => clearTimeout(timer);
  }, [form.handle, handleValid]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const problems = [
    !form.handle && 'A user handle is required',
    form.handle && !handleValid && 'A user handle can have up to 15 letters, numbers, - or _, and no spaces',
    handleValid && available === false && 'User handle is not available',
    !form.firstName && 'A first name is required',
    !form.lastName && 'A last name is required',
    !/^\S+@\S+\.\S+$/.test(form.email) && 'Please enter a valid email',
    form.password.length < 3 && 'Password must be at least 3 characters',
    form.password !== form.confirmPassword && 'Passwords must match',
  ].filter(Boolean) as string[];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (problems.length) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/users', {
        userName: `@${form.handle}`,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      // A full load, so every page picks up the new session.
      window.location.assign('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="handle" className="mb-1 block text-sm font-semibold">
          User Handle
        </label>
        <div className="flex items-center rounded bg-black ring-1 ring-raised-2">
          <span className="px-3 text-muted">@</span>
          <input id="handle" maxLength={15} className="w-full bg-transparent py-2 pr-3 text-ink focus:outline-none" value={form.handle} onChange={set('handle')} />
        </div>
        {handleValid && available === false ? <p className="text-sm text-red-400">User handle is not available</p> : null}
      </div>
      <p className="text-center text-sm text-subtle">Sign up using social media or the form</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-semibold">
            First Name
          </label>
          <input id="firstName" autoComplete="given-name" className={inputClass} value={form.firstName} onChange={set('firstName')} />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-semibold">
            Last Name
          </label>
          <input id="lastName" autoComplete="family-name" className={inputClass} value={form.lastName} onChange={set('lastName')} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-semibold">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" className={inputClass} value={form.email} onChange={set('email')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold">
            Password
          </label>
          <input id="password" type="password" autoComplete="new-password" className={inputClass} value={form.password} onChange={set('password')} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-semibold">
            Confirm Password
          </label>
          <input id="confirmPassword" type="password" autoComplete="new-password" className={inputClass} value={form.confirmPassword} onChange={set('confirmPassword')} />
        </div>
      </div>
      {submitted && problems.length ? (
        <ul role="alert" className="list-disc pl-5 text-sm text-red-400">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded bg-white px-4 py-2 text-lg text-black disabled:opacity-60">
          Sign up
        </button>
        <Link href="/login" className="rounded bg-white px-4 py-2 text-lg text-black hover:no-underline">
          Login
        </Link>
      </div>
      <p className="text-center text-sm text-subtle">Or</p>
      <OAuthButtons
        handle={handleValid ? `@${form.handle}` : undefined}
        validate={() => {
          setSubmitted(true);
          return handleValid && available !== false;
        }}
      />
    </form>
  );
}
