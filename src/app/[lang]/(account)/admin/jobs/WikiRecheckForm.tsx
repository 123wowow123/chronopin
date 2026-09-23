'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { WikiRecheckSetting } from '@/lib/wikiRecheck';

const DAY_CHOICES = [1, 7, 14, 30, 90, 180, 365];

// When the nightly job (src/server/services/wikiRecheckJob.ts) reads pins'
// links again to catch wikis the page has moved on from
// (docs/okf/playbooks/lint-the-wikis.md). Never by default: each read is a
// fetch, and a changed page costs a Claude rewrite.
export function WikiRecheckForm({ saved, lastRun }: { saved: WikiRecheckSetting; lastRun: string | null }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (patch: Partial<WikiRecheckSetting>) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<WikiRecheckSetting>('/api/admin/wiki-recheck', { ...current, ...patch });
      setCurrent(next);
      setMessage(`Saved. ${describe(next)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  // A value saved from the API that is not one of the choices still shows.
  const choices = current.days && !DAY_CHOICES.includes(current.days) ? [...DAY_CHOICES, current.days].sort((a, b) => a - b) : DAY_CHOICES;

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Re-reading link wikis</h2>
      <p className="mt-1 text-sm text-subtle">
        Every night at midnight UTC, the links due under either option below are read again. A link whose page has changed gets its wiki
        rewritten, and the pin&apos;s summary is rebuilt.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.viewed}
          disabled={busy}
          onChange={(e) => void change({ viewed: e.target.checked })}
          className="size-4 accent-accent"
        />
        When someone opens a pin: clicking into its page schedules the pin&apos;s links for that midnight
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm">
        Read links again
        <select
          value={current.days ?? ''}
          disabled={busy}
          onChange={(e) => void change({ days: e.target.value ? Number(e.target.value) : null })}
          className="field w-auto"
        >
          <option value="">never</option>
          {choices.map((days) => (
            <option key={days} value={days}>
              after {days} day{days === 1 ? '' : 's'}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-xs text-subtle">
        Both can be on. Every read counts, so a read an open brings on also moves the link&apos;s next dated read out. Cards seen on the timeline do not count.
      </p>
      <p className="mt-2 text-xs text-subtle">
        {lastRun ? `Last nightly run: ${new Date(lastRun).toISOString().replace('T', ' ').slice(0, 16)} UTC.` : 'The nightly run has not happened yet.'}
      </p>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}

function describe({ days, viewed }: WikiRecheckSetting): string {
  const age = days === null ? '' : `links last read over ${days} day${days === 1 ? '' : 's'} ago`;
  if (viewed && age) return `Links of pins opened during the day, and ${age}, are read again at midnight UTC.`;
  if (viewed) return 'Links of pins opened during the day are read again that midnight.';
  if (age) return `${age[0].toUpperCase()}${age.slice(1)} are read again at midnight UTC.`;
  return 'Links are never read again.';
}
