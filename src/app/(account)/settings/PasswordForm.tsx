'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

const MIN_LENGTH = 3;
const inputClass = 'w-full rounded bg-black px-3 py-2 text-ink ring-1 ring-raised-2 focus:ring-link focus:outline-none';

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
  return { label: levels[score], percent: Math.max(10, (score / 5) * 100) };
}

export function PasswordForm({ userId, userName }: { userId: number; userName: string }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!form.oldPassword) return setError('Enter your current password.');
    if (form.newPassword.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (form.newPassword !== form.confirmPassword) return setError('Passwords must match.');
    setBusy(true);
    try {
      await api.put(`/api/users/${userId}/password`, { oldPassword: form.oldPassword, newPassword: form.newPassword });
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password successfully changed.');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'That current password is not correct.' : 'Something went wrong, please try again.');
    } finally {
      setBusy(false);
    }
  }

  const s = strength(form.newPassword);
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-lg bg-panel p-6" noValidate>
      <h1 className="text-2xl">Change password</h1>
      <p className="text-sm text-muted">
        Enter your current password, then choose a new one for <strong>{userName}</strong>.
      </p>
      {message ? (
        <p role="status" className="rounded bg-green-900/50 px-3 py-2 text-green-300">
          {message}
        </p>
      ) : null}
      <div>
        <label htmlFor="old" className="mb-1 block text-sm font-semibold">
          Current password
        </label>
        <input id="old" type="password" autoComplete="current-password" className={inputClass} value={form.oldPassword} onChange={set('oldPassword')} />
      </div>
      <div>
        <label htmlFor="new" className="mb-1 block text-sm font-semibold">
          New password
        </label>
        <input id="new" type="password" autoComplete="new-password" className={inputClass} value={form.newPassword} onChange={set('newPassword')} />
        {form.newPassword ? (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="h-1 flex-1 rounded bg-raised-2">
              <div className="h-full rounded bg-link" style={{ width: `${s.percent}%` }} />
            </div>
            <span>{s.label}</span>
          </div>
        ) : (
          <p className="mt-1 text-xs text-subtle">Longer is stronger — mix in capitals, numbers or symbols.</p>
        )}
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-semibold">
          Confirm new password
        </label>
        <input id="confirm" type="password" autoComplete="new-password" className={inputClass} value={form.confirmPassword} onChange={set('confirmPassword')} />
      </div>
      {error ? (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="w-full rounded bg-accent py-2 font-semibold text-white disabled:opacity-60">
        Update password
      </button>
    </form>
  );
}
