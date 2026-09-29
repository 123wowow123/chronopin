'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useLocale, useT } from '@/lib/client/i18n';
import { reloadLocalWeather } from '@/lib/client/localWeather';
import { refreshSession } from '@/lib/client/session';
import { forgetViewerPlace } from '@/lib/client/viewerPlace';
import { roundCoordinate, type UserLocation } from '@/lib/location';

type Saved = { location: UserLocation | null; locationFromDevice: boolean };

// Waits this long after the last keystroke before searching.
const SEARCH_DELAY_MS = 300;

// The default location (0066): where distances are measured from, the bell's
// weather is for and the map opens on when the browser gives no position.
// Set from the device (the only thing here that asks for a position) or by
// picking a place from a search; each change saves on its own, like the
// other preferences.
export function DefaultLocationSetting({ userId, initial }: { userId: number; initial: Saved }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  // The last search's answer, kept with the query it answered.
  const [found, setFound] = useState<{ q: string; places: UserLocation[] } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locale = useLocale();
  const t = useT();

  // Places matching what is typed, from the geocoder; nothing under two
  // characters. A later query replaces an earlier one still in flight, and an
  // answer shows only while it is still for what the box says.
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

  async function save(body: Record<string, unknown>, done: (next: Saved) => string) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await api.put<Saved | undefined>(`/api/users/${userId}/preferences`, body);
      const next = res && 'location' in res ? res : { ...saved, locationFromDevice: body.locationFromDevice as boolean };
      setSaved(next);
      setMessage(done(next));
      await refreshSession();
      // Distances, the map and the weather look again from the new place.
      forgetViewerPlace();
      reloadLocalWeather();
    } catch {
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  function takeDevicePosition() {
    if (!navigator.geolocation) return setError(t('profile.locationUnavailable'));
    setBusy(true);
    setMessage('');
    setError('');
    navigator.geolocation.getCurrentPosition(
      (p) =>
        void save(
          // Rounded before it leaves the device; the server rounds again.
          { location: { latitude: roundCoordinate(p.coords.latitude), longitude: roundCoordinate(p.coords.longitude), fromDevice: true } },
          () => t('profile.locationSaved'),
        ),
      (err) => {
        setBusy(false);
        setError(err.code === err.PERMISSION_DENIED ? t('profile.locationDenied') : t('profile.locationUnavailable'));
      },
      { maximumAge: 5 * 60 * 1000, timeout: 15000 },
    );
  }

  function pick(place: UserLocation) {
    setQuery('');
    void save({ location: { latitude: place.latitude, longitude: place.longitude, name: place.name, fromDevice: false } }, () => t('profile.locationSaved'));
  }

  const location = saved.location;
  const shown = location ? location.name || `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}` : null;

  return (
    <section className="surface space-y-4 p-6" aria-labelledby="location-heading">
      <div>
        <span id="location-heading" className="field-label block">
          {t('profile.locationLabel')}
        </span>
        <span className="block text-sm text-subtle">{t('profile.locationHint')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex min-w-0 items-center gap-2 text-sm" data-testid="default-location">
          <Icon name="pin" className="size-4 shrink-0 text-subtle" />
          <span className={location ? 'font-medium' : 'text-subtle'}>{shown ?? t('profile.locationNone')}</span>
        </p>
        {location ? (
          <button type="button" onClick={() => void save({ location: null }, () => t('profile.locationCleared'))} disabled={busy} className="btn btn-ghost text-danger hover:bg-danger/10 hover:text-danger">
            {t('profile.locationClear')}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={takeDevicePosition} disabled={busy} className="btn btn-secondary">
          <Icon name="target" className="size-4" />
          {t('profile.locationUseDevice')}
        </button>
      </div>

      <div className="relative">
        <label htmlFor="location-search" className="field-label">
          {t('profile.locationSearch')}
        </label>
        <input
          id="location-search"
          type="search"
          autoComplete="off"
          className="field"
          placeholder={t('profile.locationSearchPlaceholder')}
          value={query}
          disabled={busy}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter takes the best match, as a search box would.
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault();
              pick(results[0]);
            }
          }}
        />
        {results.length ? (
          <ul className="surface absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-auto p-1 shadow-lg">
            {results.map((place) => (
              <li key={`${place.latitude},${place.longitude},${place.name}`}>
                <button type="button" onClick={() => pick(place)} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-raised">
                  {place.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={saved.locationFromDevice}
          disabled={busy}
          onChange={(e) =>
            void save({ locationFromDevice: e.target.checked }, (next) => (next.locationFromDevice ? t('profile.locationFollowOn') : t('profile.locationFollowOff')))
          }
          className="mt-0.5 size-4 accent-accent"
        />
        <span>
          <span className="field-label block">{t('profile.locationFollow')}</span>
          <span className="block text-sm text-subtle">{t('profile.locationFollowHint')}</span>
        </span>
      </label>

      {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
