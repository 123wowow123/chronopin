'use client';

import { useState } from 'react';
import { birthdayProblem, birthdayToday, EARLIEST_BIRTHDAY } from '@/lib/birthday';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useLocalize } from '@/lib/client/navigation';
import { refreshSession } from '@/lib/client/session';

// Save or skip; both land on `next`, so the answer never stands between
// somebody and the page they were going to.
export function BirthdayForm({ next }: { next: string }) {
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();
  const localize = useLocalize();

  const today = birthdayToday();
  const problem = birthdayProblem(birthday, today);

  function go() {
    // A full load, as the rest of the sign-in path uses: the session cookie is
    // new, and every page picks it up from the server this way.
    window.location.assign(localize(next));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!birthday) return go();
    if (problem) {
      return setError(problem === 'format' ? t('signup.birthdayInvalid') : t('signup.birthdayRange', { min: EARLIEST_BIRTHDAY }));
    }
    setBusy(true);
    setError('');
    try {
      await api.patch('/api/users/me', { birthday });
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
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn btn-primary w-full py-2.5">
        {t('common.save')}
      </button>
      <button type="button" onClick={go} disabled={busy} className="btn btn-ghost w-full">
        {t('signup.birthdaySkip')}
      </button>
    </form>
  );
}
