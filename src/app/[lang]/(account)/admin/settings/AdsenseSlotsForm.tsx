'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { AdsensePlacement, AdsenseSlotsSetting } from '@/lib/adsense';
import { SLOT_LABEL } from '../ads/slots';

const PLACEMENTS: { placement: AdsensePlacement; label: string; note: string }[] = [
  { placement: 'timeline-side', label: SLOT_LABEL['timeline-side'], note: 'Replaces the Amazon ads in the panel under "New pins".' },
  { placement: 'pin-side', label: SLOT_LABEL['pin-side'], note: 'Replaces the Amazon ads in the column under a pin\'s comments.' },
  { placement: 'pin-bottom', label: 'Pin page, across the bottom', note: 'A banner under the pin, above related pins. Google only.' },
];

// The AdSense ad unit of each placement that can show one. Empty keeps the
// Amazon ads there (nothing for the bottom banner); with an id, the placement
// shows that Google unit instead.
export function AdsenseSlotsForm({ saved }: { saved: AdsenseSlotsSetting }) {
  const [units, setUnits] = useState<Record<string, string>>(() => Object.fromEntries(PLACEMENTS.map(({ placement }) => [placement, saved[placement] ?? ''])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const body = Object.fromEntries(Object.entries(units).map(([placement, id]) => [placement, id.trim()]));
      const next = await api.put<AdsenseSlotsSetting>('/api/admin/adsense-slots', body);
      setUnits(Object.fromEntries(PLACEMENTS.map(({ placement }) => [placement, next[placement] ?? ''])));
      setMessage('Saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Google AdSense</h2>
      <p className="mt-1 text-sm text-subtle">
        The ad unit id (data-ad-slot, 6 to 20 digits) each placement shows. Make the units in AdSense once the site is approved. A placement left empty keeps its Amazon ads.
      </p>
      <div className="mt-3 space-y-3">
        {PLACEMENTS.map(({ placement, label, note }) => (
          <div key={placement} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="w-56 text-sm" htmlFor={`adsense-${placement}`}>
              {label}
              <span className="block text-xs text-subtle">{note}</span>
            </label>
            <input
              id={`adsense-${placement}`}
              inputMode="numeric"
              value={units[placement]}
              disabled={busy}
              onChange={(e) => setUnits({ ...units, [placement]: e.target.value })}
              placeholder="1234567890"
              className="w-48 rounded-lg border border-line bg-field px-3 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={() => void save()} className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
        Save
      </button>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
