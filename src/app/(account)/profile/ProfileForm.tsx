'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, ApiError } from '@/lib/client/api';
import { refreshSession } from '@/lib/client/session';
import type { SessionUser } from '@/lib/types';


export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '' });
  const [pictureUrl, setPictureUrl] = useState(user.pictureUrl || '');
  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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
      setPictureError(err instanceof ApiError ? err.message : 'Could not upload that picture.');
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
    if (!form.firstName || !form.lastName) return setError('First and last name are required.');
    try {
      await api.patch('/api/users/me', form);
      await refreshSession();
      router.refresh();
      setMessage('Profile saved.');
    } catch {
      setError('Could not save your profile.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface p-6">
        <span className="field-label mb-3">Picture</span>
        <div className="flex items-center gap-4">
          <UserAvatar userName={user.userName} pictureUrl={pictureUrl} className="size-20 text-3xl" />
          <div>
            <label className={`btn btn-secondary cursor-pointer ${pictureBusy ? 'opacity-50' : ''}`}>
              {pictureUrl ? 'Change picture' : 'Upload picture'}
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" disabled={pictureBusy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {pictureUrl ? (
              <button type="button" onClick={removePicture} disabled={pictureBusy} className="btn btn-ghost ml-1">
                Remove
              </button>
            ) : null}
            <p className={`mt-2 text-sm ${pictureError ? 'text-red-400' : 'text-subtle'}`}>
              {pictureError || 'Shown on your pins and comments. JPEG, PNG or GIF, up to 5 MB.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="surface space-y-4 p-6" noValidate>
        <div>
          <label htmlFor="handle" className="field-label">
            User Handle
          </label>
          <input id="handle" readOnly className="field text-subtle" value={user.userName} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="field-label">
              First Name
            </label>
            <input id="firstName" className="field" value={form.firstName} onChange={set('firstName')} />
          </div>
          <div>
            <label htmlFor="lastName" className="field-label">
              Last Name
            </label>
            <input id="lastName" className="field" value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input id="email" type="email" className="field" value={form.email} onChange={set('email')} />
        </div>
        {message ? <p role="status" className="text-sm text-emerald-400">{message}</p> : null}
        {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" className="btn btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
