'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import { AFFINITY_BOOST, CLICKED_BOOST, type PersonalBagSetting } from '@/lib/userWiki';

// Whether a crowded day's cards are weighed by the signed-in viewer's
// preference wiki: pins they opened, and categories and companies they lean to.
export function PersonalBagForm({ saved, wikis }: { saved: PersonalBagSetting; wikis: number }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<PersonalBagSetting>('/api/admin/personal-bag', { enabled });
      setCurrent(next);
      setMessage(next.enabled ? 'Saved. Signed-in viewers now see their own pick.' : 'Saved. Everyone now sees the same pick.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Prefer personal pick on overflow days</h2>
      <p className="mt-1 text-sm text-subtle">
        When a day has more pins than the timeline shows, the cards are a weighted pick. With this on, a signed-in viewer&apos;s
        preference wiki weighs it too: a pin they have opened counts {1 + CLICKED_BOOST}&times;, and one in a category or company they
        lean to up to {AFFINITY_BOOST}&times; its share more. {wikis} user wiki(s) built so far.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={current.enabled} disabled={busy} onChange={(e) => void change(e.target.checked)} className="size-4 accent-accent" />
        Weigh the pick by each viewer&apos;s preferences
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
