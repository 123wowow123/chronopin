'use client';

import { useRouter } from '@/lib/client/navigation';
import { useRef, useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { birthdayProblem, birthdayToday, EARLIEST_BIRTHDAY } from '@/lib/birthday';
import { api, ApiError } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import type { SessionUser } from '@/lib/types';
import { useT } from '@/lib/client/i18n';


export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  // An empty birthday is what takes it back off the account, so the patch
  // sends the field either way.
  const [form, setForm] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', birthday: user.birthday || '', email: user.email || '' });
  const [pictureUrl, setPictureUrl] = useState(user.pictureUrl || '');
  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function upload(file: File) {
    setPictureBusy(true);
    setPictureError('');
    try {
      const body = new FormData();
      body.append('picture', file);
      const res = await api.put<{ pictureUrl: string }>('/api/users/me/picture', body);
      setPictureUrl(res.pictureUrl);
      await refreshSession();
    } catch (err) {
      setPictureError(err instanceof ApiError ? err.message : t('profile.uploadFailed'));
    } finally {
      setPictureBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removePicture() {
    setPictureBusy(true);
    try {
      await api.delete('/api/users/me/picture');
      setPictureUrl('');
      await refreshSession();
    } finally {
      setPictureBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!form.firstName || !form.lastName) return setError(t('profile.namesRequired'));
    const badBirthday = birthdayProblem(form.birthday);
    if (badBirthday) {
      return setError(badBirthday === 'format' ? t('signup.birthdayInvalid') : t('signup.birthdayRange', { min: EARLIEST_BIRTHDAY }));
    }
    try {
      await api.patch('/api/users/me', form);
      await refreshSession();
      router.refresh();
      setMessage(t('profile.saved'));
    } catch (err) {
      const code = err instanceof ApiError ? (err.body as { code?: string } | undefined)?.code : undefined;
      setError(code === 'emailTaken' ? t('signup.emailTaken') : code === 'handleTaken' ? t('signup.handleTaken') : t('profile.saveFailed'));
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface p-6">
        <span className="field-label mb-3">{t('profile.picture')}</span>
        <div className="flex items-center gap-4">
          <UserAvatar userName={user.userName} pictureUrl={pictureUrl} className="size-20 text-3xl" />
          <div>
            <label className={`btn btn-secondary cursor-pointer ${pictureBusy ? 'opacity-50' : ''}`}>
              {pictureUrl ? t('profile.changePicture') : t('profile.uploadPicture')}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" disabled={pictureBusy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {pictureUrl ? (
              <button type="button" onClick={removePicture} disabled={pictureBusy} className="btn btn-ghost ml-1">
                {t('common.remove')}
              </button>
            ) : null}
            <p className={`mt-2 text-sm ${pictureError ? 'text-danger' : 'text-subtle'}`}>
              {pictureError || t('profile.pictureHint')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="surface space-y-4 p-6" noValidate>
        <div>
          <label htmlFor="handle" className="field-label">
            {t('signup.handle')}
          </label>
          <input id="handle" readOnly className="field text-subtle" value={user.userName} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="field-label">
              {t('signup.firstName')}
            </label>
            <input id="firstName" className="field" value={form.firstName} onChange={set('firstName')} />
          </div>
          <div>
            <label htmlFor="lastName" className="field-label">
              {t('signup.lastName')}
            </label>
            <input id="lastName" className="field" value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div>
          <label htmlFor="birthday" className="field-label">
            {t('signup.birthday')}
          </label>
          <input id="birthday" type="date" autoComplete="bday" min={EARLIEST_BIRTHDAY} max={birthdayToday()} className="field" value={form.birthday} onChange={set('birthday')} />
          <p className="mt-1.5 text-sm text-subtle">{t('signup.birthdayHint')}</p>
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            {t('account.email')}
          </label>
          <input id="email" type="email" className="field" value={form.email} onChange={set('email')} />
        </div>
        {message ? <p role="status" className="text-sm text-success">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <button type="submit" className="btn btn-primary">
          {t('profile.saveChanges')}
        </button>
      </form>
    </div>
  );
}
