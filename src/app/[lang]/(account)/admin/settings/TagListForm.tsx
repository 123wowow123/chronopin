'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { TagListSetting } from '@/lib/tagList';

// Whether the tag panel in the filters lists its tags, or is only the button
// to the big tag cloud (src/lib/tagList.ts). Off by default.
export function TagListForm({ saved }: { saved: TagListSetting }) {
  const [current, setCurrent] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<TagListSetting>('/api/admin/tag-list', { enabled });
      setCurrent(next);
      setMessage(next.enabled ? 'Saved. The Tags panel lists its tags again.' : 'Saved. The Tags row now opens the tag cloud.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Tag list in the filters</h2>
      <p className="mt-1 text-sm text-subtle">
        The Tags panel in the filters - in the menu drawer on a phone, beside the cards on a wide screen - can list every tag to pick from. Off, the
        Tags row is a button that opens the tag cloud, and tags are picked there.
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={current.enabled}
          disabled={busy}
          onChange={(e) => void change(e.target.checked)}
          className="size-4 accent-accent"
        />
        List the tags in the Tags panel
      </label>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
