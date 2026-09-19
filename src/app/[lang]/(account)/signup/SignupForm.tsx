'use client';

import Link from '@/components/ui/Link';
import { useSearchParams } from '@/lib/client/navigation';
import { useEffect, useState } from 'react';
import { OAuthButtons, OrDivider } from '@/components/forms/OAuthButtons';
import { afterLoginPath, authHref } from '@/lib/authRedirect';
import { api, ApiError } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useLocalize } from '@/lib/client/navigation';

const HANDLE = /^[a-zA-Z0-9-_]+$/;

export function SignupForm() {
  const params = useSearchParams();
  const redirect = afterLoginPath(params.get('redirect'));
  const [form, setForm] = useState({ handle: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  // The last availability answer, for the handle it was about.
  const [check, setCheck] = useState<{ handle: string; available: boolean } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();
  const localize = useLocalize();

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
    !form.handle && t('signup.handleRequired'),
    form.handle && !handleValid && t('signup.handleInvalid'),
    handleValid && available === false && t('signup.handleTaken'),
    !form.firstName && t('signup.firstNameRequired'),
    !form.lastName && t('signup.lastNameRequired'),
    !/^\S+@\S+\.\S+$/.test(form.email) && t('signup.emailInvalid'),
    form.password.length < 3 && t('signup.passwordShort', { min: 3 }),
    form.password !== form.confirmPassword && t('signup.passwordsMatch'),
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
      window.location.assign(localize(redirect));
    } catch (err) {
      // By code: the server's text is English (a 422's is a raw database error).
      const code = err instanceof ApiError ? (err.body as { code?: string } | undefined)?.code : undefined;
      setError(code === 'emailTaken' ? t('signup.emailTaken') : code === 'handleTaken' ? t('signup.handleTaken') : t('common.somethingWrong'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="handle" className="field-label">
          {t('signup.handle')}
        </label>
        <div className="field flex items-center p-0 focus-within:ring-2 focus-within:ring-link">
          <span className="pl-3 text-subtle">@</span>
          <input id="handle" maxLength={15} className="w-full bg-transparent py-2 pr-3 pl-0.5 text-ink focus:outline-none focus-visible:outline-none" value={form.handle} onChange={set('handle')} />
        </div>
        {handleValid && available === false ? <p className="mt-1.5 text-sm text-danger">{t('signup.handleTaken')}</p> : null}
        {handleValid && available ? <p className="mt-1.5 text-sm text-success">{t('signup.handleAvailable', { handle: `@${form.handle}` })}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="field-label">
            {t('signup.firstName')}
          </label>
          <input id="firstName" autoComplete="given-name" className="field" value={form.firstName} onChange={set('firstName')} />
        </div>
        <div>
          <label htmlFor="lastName" className="field-label">
            {t('signup.lastName')}
          </label>
          <input id="lastName" autoComplete="family-name" className="field" value={form.lastName} onChange={set('lastName')} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="field-label">
          {t('account.email')}
        </label>
        <input id="email" type="email" autoComplete="email" className="field" value={form.email} onChange={set('email')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="field-label">
            {t('account.password')}
          </label>
          <input id="password" type="password" autoComplete="new-password" className="field" value={form.password} onChange={set('password')} />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="field-label">
            {t('signup.confirmPassword')}
          </label>
          <input id="confirmPassword" type="password" autoComplete="new-password" className="field" value={form.confirmPassword} onChange={set('confirmPassword')} />
        </div>
      </div>
      {submitted && problems.length ? (
        <ul role="alert" className="list-disc space-y-0.5 rounded-lg bg-red-500/10 py-2 pr-3 pl-7 text-sm text-danger-soft ring-1 ring-red-500/20 ring-inset">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
        {t('nav.signUp')}
      </button>
      <OrDivider />
      <OAuthButtons
        handle={handleValid ? `@${form.handle}` : undefined}
        redirect={redirect}
        validate={() => {
          setSubmitted(true);
          return handleValid && available !== false;
        }}
      />
      <p className="pt-2 text-center text-sm text-subtle">
        {t.rich('signup.haveAccount', {
          link: (chunks) => (
            <Link href={authHref('/login', params.get('redirect'))} className="underline decoration-link/40 underline-offset-2 hover:decoration-link">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
