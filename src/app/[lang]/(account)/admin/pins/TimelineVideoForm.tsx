'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { TimelineVideoSetting } from '@/lib/timelineVideo';

// Whether cards on the timeline and in search results load their video player,
// on phones and on wider screens; otherwise a card shows the video's still and
// the pin's own page plays it. Both are off by default: a column of cards
// nobody asked to play is the heaviest thing the timeline can pull in.
export function TimelineVideoForm({ saved }: { saved: TimelineVideoSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (patch: Partial<TimelineVideoSetting>) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<TimelineVideoSetting>('/api/admin/timeline-video', { ...current, ...patch });
      setCurrent(next);
      setMessage(`Saved. ${describe(next)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Video on the timeline</h2>
      <p className="mt-1 text-sm text-subtle">
        A card on the timeline and in search results can show a YouTube video as its still picture instead of the player. Phones
        are screens under 640px wide. The pin&apos;s own page always plays.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.desktop}
          disabled={busy}
          onChange={(e) => void change({ desktop: e.target.checked })}
          className="size-4 accent-accent"
        />
        Load the video player on wider screens
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.mobile}
          disabled={busy}
          onChange={(e) => void change({ mobile: e.target.checked })}
          className="size-4 accent-accent"
        />
        Load the video player on phones
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}

function describe({ mobile, desktop }: TimelineVideoSetting): string {
  if (mobile && desktop) return 'Cards now load the player everywhere.';
  if (!mobile && !desktop) return 'Cards now show the still everywhere.';
  return desktop ? 'Wider screens load the player; phones show the still.' : 'Phones load the player; wider screens show the still.';
}
