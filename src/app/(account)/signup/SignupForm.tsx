'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OAuthButtons, OrDivider } from '@/components/forms/OAuthButtons';
import { api, ApiError } from '@/lib/client/api';

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
      // A full load, so every page picks up the new session (router.push would
      // replay the router's remembered redirect to /login).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong, please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="handle" className="field-label">
          User Handle
        </label>
        <div className="field flex items-center p-0 focus-within:ring-2 focus-within:ring-link">
          <span className="pl-3 text-subtle">@</span>
          <input id="handle" maxLength={15} className="w-full bg-transparent py-2 pr-3 pl-0.5 text-ink focus:outline-none focus-visible:outline-none" value={form.handle} onChange={set('handle')} />
        </div>
        {handleValid && available === false ? <p className="mt-1.5 text-sm text-red-400">User handle is not available</p> : null}
        {handleValid && available ? <p className="mt-1.5 text-sm text-emerald-400">@{form.handle} is available</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="field-label">
            First Name
          </label>
          <input id="firstName" autoComplete="given-name" className="field" value={form.firstName} onChange={set('firstName')} />
        </div>
        <div>
          <label htmlFor="lastName" className="field-label">
            Last Name
          </label>
          <input id="lastName" autoComplete="family-name" className="field" value={form.lastName} onChange={set('lastName')} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" className="field" value={form.email} onChange={set('email')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input id="password" type="password" autoComplete="new-password" className="field" value={form.password} onChange={set('password')} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="field-label">
            Confirm Password
          </label>
          <input id="confirmPassword" type="password" autoComplete="new-password" className="field" value={form.confirmPassword} onChange={set('confirmPassword')} />
        </div>
      </div>
      {submitted && problems.length ? (
        <ul role="alert" className="list-disc space-y-0.5 rounded-lg bg-red-500/10 py-2 pr-3 pl-7 text-sm text-red-300 ring-1 ring-red-500/20 ring-inset">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
        Sign up
      </button>
      <OrDivider />
      <OAuthButtons
        handle={handleValid ? `@${form.handle}` : undefined}
        validate={() => {
          setSubmitted(true);
          return handleValid && available !== false;
        }}
      />
      <p className="pt-2 text-center text-sm text-subtle">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
