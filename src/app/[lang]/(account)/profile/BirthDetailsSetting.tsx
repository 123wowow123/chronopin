'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useLocale, useT } from '@/lib/client/i18n';
import type { UserLocation } from '@/lib/location';

type Saved = { time: string | null; placeName: string | null; latitude: number | null; longitude: number | null };

const SEARCH_DELAY_MS = 300;

// The hour and place of birth (0222), for the daily horoscope's Moon and
// rising sign. Both optional; saved together with the button, since a time
// without its place can place nothing.
export function BirthDetailsSetting({ initial }: { initial: Saved }) {
  const [saved, setSaved] = useState(initial);
  const [time, setTime] = useState(initial.time ?? '');
  const [place, setPlace] = useState<UserLocation | null>(initial.latitude != null && initial.longitude != null ? { latitude: initial.latitude, longitude: initial.longitude, name: initial.placeName } : null);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ q: string; places: UserLocation[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locale = useLocale();
  const t = useT();

  const q = query.trim();
  const results = q.length >= 2 && found?.q === q ? found.places : [];
  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/place/search?q=${encodeURIComponent(q)}&lang=${locale}`, { signal: controller.signal });
        setFound({ q, places: res.ok ? ((await res.json()) as UserLocation[]) : [] });
      } catch {
        // Aborted by the next keystroke, or offline: no suggestions.
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, locale]);

  async function save(nextTime: string, nextPlace: UserLocation | null, done: string) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await api.put<Saved>('/api/users/me/birth', { time: nextTime || null, place: nextPlace });
      setSaved(res);
      setMessage(done);
    } catch {
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  const dirty = (time || null) !== saved.time || (place?.latitude ?? null) !== saved.latitude || (place?.longitude ?? null) !== saved.longitude;

  return (
    <section className="surface space-y-4 p-6" aria-labelledby="birth-heading">
      <div>
        <span id="birth-heading" className="field-label block">
          {t('profile.birthTitle')}
        </span>
        <span className="block text-sm text-subtle">{t('profile.birthHint')}</span>
      </div>

      <div>
        <label htmlFor="birth-time" className="field-label">
          {t('profile.birthTime')}
        </label>
        <input id="birth-time" type="time" className="field" value={time} disabled={busy} onChange={(e) => setTime(e.target.value)} />
        <p className="mt-1.5 text-sm text-subtle">{t('profile.birthTimeHint')}</p>
      </div>

      <div className="relative">
        <label htmlFor="birth-place" className="field-label">
          {t('profile.birthPlace')}
        </label>
        <p className="mb-2 flex min-w-0 items-center gap-2 text-sm" data-testid="birth-place">
          <Icon name="pin" className="size-4 shrink-0 text-subtle" />
          <span className={place ? 'font-medium' : 'text-subtle'}>{place ? place.name || `${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}` : t('profile.birthNone')}</span>
        </p>
        <input
          id="birth-place"
          type="search"
          autoComplete="off"
          className="field"
          placeholder={t('profile.birthPlaceSearch')}
          value={query}
          disabled={busy}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault();
              setPlace(results[0]);
              setQuery('');
            }
          }}
        />
        {results.length ? (
          <ul className="surface absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-auto p-1 shadow-lg">
            {results.map((p) => (
              <li key={`${p.latitude},${p.longitude},${p.name}`}>
                <button
                  type="button"
                  onClick={() => {
                    setPlace(p);
                    setQuery('');
                  }}
                  className="w-full rounded-md px-3 py-2 text-start text-sm hover:bg-raised"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={() => void save(time, place, t('profile.birthSaved'))}>
          {t('common.save')}
        </button>
        {saved.time || saved.latitude != null ? (
          <button
            type="button"
            disabled={busy}
            className="btn btn-ghost text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => {
              setTime('');
              setPlace(null);
              void save('', null, t('profile.birthSaved'));
            }}
          >
            {t('profile.birthClear')}
          </button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
