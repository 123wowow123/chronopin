'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { WeeklyDigestSetting } from '@/lib/weeklyDigest';

// The switch for the weekly email, and a button that sends the admin their own
// copy. The switch is off until turned on: it sends real email.
export function DigestControls({ saved }: { saved: WeeklyDigestSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      setMessage(await work());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Send the weekly email</h2>
      <p className="mt-1 max-w-3xl text-sm text-subtle">
        Mondays from 13:00 UTC, everyone with a confirmed address who has not opted out gets the pins starting in the next 7 days that they watch or that
        companies and people they follow made. Nothing is sent when there is nothing coming up. One email per person per week, whatever the
        number of servers.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) =>
            void run(async () => {
              const next = await api.put<WeeklyDigestSetting>('/api/admin/weekly-digest', { enabled: e.target.checked });
              setCurrent(next);
              return next.enabled ? 'Saved. The next Monday slot will send.' : 'Saved. Nothing will be sent.';
            })
          }
          className="size-4 accent-accent"
        />
        Send the weekly email
      </label>
      <button
        type="button"
        className="btn btn-secondary mt-3"
        disabled={busy}
        onClick={() => void run(async () => (await api.post<{ message: string }>('/api/admin/weekly-digest', {})).message)}
      >
        Email me my own digest now
      </button>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
