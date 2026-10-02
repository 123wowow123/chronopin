'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { AdPlacementsSetting } from '@/lib/adPlacements';
import type { AdSlot } from '@/lib/ads';
import { SLOT_LABEL } from '../ads/slots';

const SLOTS: { slot: AdSlot; note: string }[] = [
  { slot: 'timeline-row', note: 'An ad row between days.' },
  { slot: 'timeline-side', note: 'An ad panel under "New pins".' },
  { slot: 'pin-strip', note: 'A row of related ads under a pin\'s tags.' },
  { slot: 'pin-side', note: 'A column of ads under a pin\'s comments.' },
  { slot: 'drawer', note: 'Up to two ads in the phone and tablet menu, above Log out, only as many as fit without making the menu scroll.' },
];

// Which ad placements show their ads, each on its own.
export function AdPlacementsForm({ saved }: { saved: AdPlacementsSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (slot: AdSlot, enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<AdPlacementsSetting>('/api/admin/ad-placements', { ...current, [slot]: enabled });
      setCurrent(next);
      setMessage(`Saved. ${SLOT_LABEL[slot]} ${next[slot] ? 'now shows ads' : 'shows no ads'}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Ad placements</h2>
      <p className="mt-1 text-sm text-subtle">Each placement can be switched off on its own. Off, it shows no ads and counts nothing.</p>
      <div className="mt-3 space-y-2">
        {SLOTS.map(({ slot, note }) => (
          <label key={slot} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={current[slot]}
              disabled={busy}
              onChange={(e) => void change(slot, e.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            <span>
              {SLOT_LABEL[slot]}
              <span className="block text-xs text-subtle">{note}</span>
            </span>
          </label>
        ))}
      </div>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
