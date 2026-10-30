'use client';

import { useState } from 'react';
import Link from '@/components/ui/Link';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { MAX_SEARCH_ALERTS, searchAlertName, type SearchAlertRow } from '@/lib/searchAlerts';

// The searches the reader saved (from "Save search" on the search page), each
// with its own bell and email switches and a button that deletes it.
export function SearchAlertsList({ initial }: { initial: SearchAlertRow[] }) {
  const t = useT();
  const [searches, setSearches] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function change(id: number, patch: { notifyBell?: boolean; notifyDigest?: boolean }) {
    setBusy(id);
    setError('');
    try {
      const saved = await api.patch<SearchAlertRow>(`/api/search-alerts/${id}`, patch);
      setSearches((list) => list.map((s) => (s.id === id ? saved : s)));
    } catch {
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    setBusy(id);
    setError('');
    try {
      await api.delete(`/api/search-alerts/${id}`);
      setSearches((list) => list.filter((s) => s.id !== id));
    } catch {
      setError(t('duplicates.saveFailed'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="search-alerts-heading" className="surface px-4 py-4">
      <h2 id="search-alerts-heading" className="flex items-baseline justify-between gap-2 text-lg font-semibold text-ink">
        {t('searchAlerts.heading')}
        <span className="text-sm font-normal text-subtle tabular-nums">{t('searchAlerts.count', { count: searches.length, max: MAX_SEARCH_ALERTS })}</span>
      </h2>
      <p className="mt-1 text-sm text-subtle">{t('searchAlerts.intro')}</p>
      {searches.length ? (
        <ul className="mt-3 divide-y divide-line">
          {searches.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <span className="min-w-0 flex-1 basis-56">
                <Link href={`/search?q=${encodeURIComponent(s.query)}`} className="block truncate font-medium text-ink hover:text-link hover:no-underline">
                  {searchAlertName(s)}
                </Link>
                {s.label?.trim() ? <span className="block break-words font-mono text-xs text-subtle">{s.query}</span> : null}
              </span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={s.notifyBell} disabled={busy === s.id} onChange={(e) => void change(s.id, { notifyBell: e.target.checked })} className="size-4 accent-accent" />
                  {t('searchAlerts.bell')}
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={s.notifyDigest} disabled={busy === s.id} onChange={(e) => void change(s.id, { notifyDigest: e.target.checked })} className="size-4 accent-accent" />
                  {t('searchAlerts.digest')}
                </label>
                <button type="button" disabled={busy === s.id} onClick={() => void remove(s.id)} className="text-subtle hover:text-danger-soft">
                  {t('common.delete')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-subtle">{t('searchAlerts.empty')}</p>
      )}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
