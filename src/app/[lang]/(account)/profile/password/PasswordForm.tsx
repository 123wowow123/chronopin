'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import type { Translator } from '@/lib/i18n/translate';

const MIN_LENGTH = 3;

function strength(password: string, t: Translator) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = ['password.weak', 'password.weak', 'password.fair', 'password.good', 'password.strong', 'password.strong'] as const;
  return { label: t(levels[score]), percent: Math.max(10, (score / 5) * 100) };
}

export function PasswordForm({ userId }: { userId: number }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!form.oldPassword) return setError(t('password.enterCurrent'));
    if (form.newPassword.length < MIN_LENGTH) return setError(t('password.tooShort', { min: MIN_LENGTH }));
    if (form.newPassword !== form.confirmPassword) return setError(t('password.mustMatch'));
    setBusy(true);
    try {
      await api.put(`/api/users/${userId}/password`, { oldPassword: form.oldPassword, newPassword: form.newPassword });
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setMessage(t('password.changed'));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? t('password.wrongCurrent') : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const s = strength(form.newPassword, t);
  return (
    <form onSubmit={submit} className="surface space-y-4 p-6" noValidate>
      {message ? (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-success-soft ring-1 ring-emerald-500/20 ring-inset">
          {message}
        </p>
      ) : null}
      <div>
        <label htmlFor="old" className="field-label">
          {t('password.current')}
        </label>
        <input id="old" type="password" autoComplete="current-password" className="field" value={form.oldPassword} onChange={set('oldPassword')} />
      </div>
      <div>
        <label htmlFor="new" className="field-label">
          {t('password.new')}
        </label>
        <input id="new" type="password" autoComplete="new-password" className="field" value={form.newPassword} onChange={set('newPassword')} />
        {form.newPassword ? (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="h-1.5 flex-1 rounded-full bg-raised-2">
              <div className="h-full rounded-full bg-link transition-[width]" style={{ width: `${s.percent}%` }} />
            </div>
            <span>{s.label}</span>
          </div>
        ) : (
          <p className="mt-1 text-xs text-subtle">{t('password.hint')}</p>
        )}
      </div>
      <div>
        <label htmlFor="confirm" className="field-label">
          {t('password.confirm')}
        </label>
        <input id="confirm" type="password" autoComplete="new-password" className="field" value={form.confirmPassword} onChange={set('confirmPassword')} />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
        {t('password.update')}
      </button>
    </form>
  );
}
