'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';
import type { SiteVerificationSetting } from '@/lib/siteVerification';

// A site-ownership meta tag on every page, for an ad or affiliate network's
// verification (src/lib/siteVerification.ts) - Impact's by default, whose
// name and code both change when the account is re-verified, moved, or
// another network is added.
export function SiteVerificationForm({ saved }: { saved: SiteVerificationSetting }) {
  const [name, setName] = useState(saved.name ?? '');
  const [value, setValue] = useState(saved.value ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<SiteVerificationSetting>('/api/admin/site-verification', { name, value });
      setName(next.name ?? '');
      setValue(next.value ?? '');
      setMessage(next.name && next.value ? `Saved. The page now carries <meta name="${next.name}">.` : 'Saved. No verification tag is shown.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the setting.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Site verification tag</h2>
      <p className="mt-1 text-sm text-subtle">
        A single <code>&lt;meta&gt;</code> tag on every page, for an ad or affiliate network to confirm this site is the account&apos;s own.
        Leave either side blank to show no tag.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Tag name
          <input
            type="text"
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            placeholder="impact-site-verification"
            className="rounded-lg border border-line bg-base px-3 py-1.5 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Code
          <input
            type="text"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            placeholder="the code the network gives"
            className="rounded-lg border border-line bg-base px-3 py-1.5 font-mono text-xs"
          />
        </label>
      </div>
      <button type="button" onClick={() => void save()} disabled={busy} className="btn btn-secondary mt-3">
        Save
      </button>
      {message ? <p className="mt-2 text-sm text-success" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}
