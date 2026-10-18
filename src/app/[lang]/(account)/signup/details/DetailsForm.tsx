'use client';

import { useState } from 'react';
import { birthdayProblem, birthdayToday, EARLIEST_BIRTHDAY } from '@/lib/birthday';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useLocalize } from '@/lib/client/navigation';
import { refreshSession } from '@/lib/client/session';
import { phoneProblem } from '@/lib/phone';

// Save or skip; both land on `next`, so the answers never stand between
// somebody and the page they were going to. Either field may stay empty. One
// already on the account starts filled in, and is sent back unchanged.
export function DetailsForm({ next, birthday: savedBirthday, phone: savedPhone }: { next: string; birthday: string; phone: string }) {
  const [birthday, setBirthday] = useState(savedBirthday);
  const [phone, setPhone] = useState(savedPhone);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();
  const localize = useLocalize();

  const today = birthdayToday();
  const badBirthday = birthdayProblem(birthday, today);

  function go() {
    // A full load, as the rest of the sign-in path uses: the session cookie is
    // new, and every page picks it up from the server this way. Replacing, so
    // the last of the sign-up pages leaves the back button alone.
    window.location.replace(localize(next));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!birthday && !phone) return go();
    if (badBirthday) {
      return setError(badBirthday === 'format' ? t('signup.birthdayInvalid') : t('signup.birthdayRange', { min: EARLIEST_BIRTHDAY }));
    }
    if (phoneProblem(phone)) return setError(t('signup.phoneInvalid'));
    setBusy(true);
    setError('');
    try {
      // Only what was answered: an empty field here is a skip, not a request
      // to clear what the account already holds.
      await api.patch('/api/users/me', { ...(birthday && { birthday }), ...(phone && { phone }) });
      await refreshSession();
      go();
    } catch {
      setError(t('common.somethingWrong'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <div>
        <label htmlFor="birthday" className="field-label">
          {t('signup.birthday')}
        </label>
        <input
          id="birthday"
          type="date"
          autoComplete="bday"
          autoFocus
          min={EARLIEST_BIRTHDAY}
          max={today}
          className="field"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />
        <p className="mt-1.5 text-sm text-subtle">{t('signup.birthdayHint')}</p>
      </div>
      <div>
        <label htmlFor="phone" className="field-label">
          {t('signup.phone')}
        </label>
        <input id="phone" type="tel" autoComplete="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <p className="mt-1.5 text-sm text-subtle">{t('signup.phoneHint')}</p>
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
        {t('common.save')}
      </button>
      <button type="button" onClick={go} disabled={busy} className="btn btn-ghost w-full">
        {t('signup.detailsSkip')}
      </button>
    </form>
  );
}
