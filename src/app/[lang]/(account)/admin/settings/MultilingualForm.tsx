'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { LOCALE_NAMES } from '@/lib/i18n/config';
import { OTHER_LOCALES, type MultilingualSetting, type OtherLocale } from '@/lib/multilingual';

// Which of the site's other languages are offered, each on its own
// (src/lib/multilingual.ts). None by default.
export function MultilingualForm({ saved }: { saved: MultilingualSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (locale: OtherLocale, on: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const locales = on ? [...current.locales, locale] : current.locales.filter((l) => l !== locale);
      const next = await api.put<MultilingualSetting>('/api/admin/multilingual', { locales });
      setCurrent(next);
      setMessage(
        next.locales.length ? `Saved. Offered: ${next.locales.map((l) => LOCALE_NAMES[l]).join(', ')}.` : 'Saved. Every page is now English.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Other languages</h2>
      <p className="mt-1 text-sm text-subtle">
        The languages the site can be read in besides English, picked in a viewer&apos;s profile or from their browser&apos;s language. A
        language left off is English: links to it open the English page, the profile&apos;s picker leaves it out, and new or edited pins
        are not translated into it. Its stored translations and saved language choices are kept for offering it again.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {OTHER_LOCALES.map((locale) => (
          <label key={locale} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={current.locales.includes(locale)}
              disabled={busy}
              onChange={(e) => void change(locale, e.target.checked)}
              className="size-4 accent-accent"
            />
            <span lang={locale}>{LOCALE_NAMES[locale]}</span>
          </label>
        ))}
      </div>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
