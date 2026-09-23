'use client';

import { useRouter } from '@/lib/client/navigation';
import { useEffect, useRef, useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { birthdayProblem, birthdayToday, EARLIEST_BIRTHDAY } from '@/lib/birthday';
import { api, ApiError } from '@/lib/client/api';
import { phoneProblem } from '@/lib/phone';
import { refreshSession } from '@/lib/client/session';
import type { SessionUser } from '@/lib/types';
import { useT } from '@/lib/client/i18n';


// How long "Remove picture" can be taken back.
const UNDO_MS = 10_000;

// The removal itself. keepalive, so one sent as the page goes still arrives;
// the session is the httpOnly cookie, which it carries like any other request.
function sendRemoval(keepalive = false) {
  return fetch('/api/users/me/picture', { method: 'DELETE', credentials: 'same-origin', keepalive });
}

export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  // An empty birthday or phone is what takes it back off the account, so the
  // patch sends the field either way.
  const [form, setForm] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', birthday: user.birthday || '', phone: user.phone || '', email: user.email || '' });
  const [pictureUrl, setPictureUrl] = useState(user.pictureUrl || '');
  const [pictureBusy, setPictureBusy] = useState(false);
  const [pictureError, setPictureError] = useState('');
  // A picture just removed, while Undo stands in for "Remove picture". The
  // server deletes a picture's stored image along with it, so nothing is sent
  // until the Undo goes: ten seconds on, a new upload, or the page left.
  // Taking it back until then needs nothing from the server at all.
  const [undoable, setUndoable] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function upload(file: File) {
    // A new picture replaces the one held back, which the upload deletes
    // on its own: there is nothing left to undo.
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    setUndoable(null);
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

  function removePicture() {
    const held = pictureUrl;
    setUndoable(held);
    setPictureUrl('');
    setPictureError('');
    // The picture is handed over rather than read from state when the time
    // is up: the timer's closure is this render's, from before it was held.
    undoTimer.current = setTimeout(() => void commitRemoval(held), UNDO_MS);
  }

  function undoRemoval() {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
    if (undoable) setPictureUrl(undoable);
    setUndoable(null);
  }

  // The Undo's time is up: the picture goes for good. Should that fail, it is
  // still on the account, so it comes back on the page with the reason.
  async function commitRemoval(held: string) {
    undoTimer.current = null;
    setUndoable(null);
    try {
      const res = await sendRemoval();
      if (!res.ok) throw new Error(res.statusText);
      await refreshSession();
    } catch {
      setPictureUrl(held);
      setPictureError(t('profile.removeFailed'));
    }
  }

  // Leaving with the Undo still up - another page, or the tab closed - is
  // letting it lapse, so the removal is sent then. Also when the page is only
  // hidden (React keeps recent pages mounted but hidden, which tears effects
  // down): the reader has moved on either way.
  useEffect(() => {
    const flush = () => {
      if (!undoTimer.current) return;
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
      void sendRemoval(true);
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!form.firstName || !form.lastName) return setError(t('profile.namesRequired'));
    const badBirthday = birthdayProblem(form.birthday);
    if (badBirthday) {
      return setError(badBirthday === 'format' ? t('signup.birthdayInvalid') : t('signup.birthdayRange', { min: EARLIEST_BIRTHDAY }));
    }
    if (phoneProblem(form.phone)) return setError(t('signup.phoneInvalid'));
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
              // Says what it removes - beside "Change picture" a bare "Remove"
              // could be read as taking off anything on the page - and is red,
              // as taking something away is across the site.
              <button key="remove" type="button" onClick={removePicture} disabled={pictureBusy} className="btn btn-ghost ml-1 text-danger hover:bg-danger/10 hover:text-danger">
                {t('profile.removePicture')}
              </button>
            ) : undoable ? (
              // In the removal's place until it is sent, in the accent's tint:
              // set apart from the grey upload beside it as the one thing to
              // press to get the picture back, and not red, since putting it
              // back takes nothing away. Keyed apart from the red one, which
              // would otherwise be reused and fade its red out.
              <button key="undo" type="button" onClick={undoRemoval} className="btn ml-1 bg-accent/15 text-link ring-1 ring-accent/30 ring-inset hover:bg-accent/25">
                {t('common.undo')}
              </button>
            ) : null}
            <p aria-live="polite" className={`mt-2 text-sm ${pictureError ? 'text-danger' : 'text-subtle'}`}>
              {pictureError || (undoable ? t('profile.pictureRemoved') : t('profile.pictureHint'))}
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
          <label htmlFor="phone" className="field-label">
            {t('signup.phone')}
          </label>
          <input id="phone" type="tel" autoComplete="tel" className="field" value={form.phone} onChange={set('phone')} />
          <p className="mt-1.5 text-sm text-subtle">{t('signup.phoneHint')}</p>
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
