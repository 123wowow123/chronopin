'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export type StoreRow = { code: string; name: string; host: string; ads: number; global: boolean };

// What a store is doing: serving needs both its own tracking id and ads for it.
function status(tag: string, ads: number, global: boolean): { text: string; tone: string } {
  const programs = `${ads} program ad${ads === 1 ? '' : 's'}`;
  if (global && ads) return { text: `Serving: ${programs} + product ads, ${tag ? 'own id' : 'US id'}`, tone: 'text-success' };
  if (global) return { text: 'No program ads here; US ads shown', tone: 'text-subtle' };
  if (tag && ads) return { text: `Serving (${programs})`, tone: 'text-success' };
  if (tag) return { text: 'Id set, no ads for this store yet', tone: 'text-subtle' };
  if (ads) return { text: `${programs} ready, needs an id`, tone: 'text-subtle' };
  return { text: 'No id, no ads', tone: 'text-subtle' };
}

// The Amazon Associates tracking id of every store. Under Amazon's Global
// Earning the US id also earns in Canada, the UK, Germany, France, Italy,
// Spain, the Netherlands, Poland and Sweden, so those stores need none (a
// field filled in there overrides it); other countries, like Japan, are their
// own Associates programs and need their own. A viewer gets their country's
// store when it has an id and ads; everyone else gets the US store.
export function AmazonTagsForm({ saved, stores, usTag }: { saved: Record<string, string>; stores: StoreRow[]; usTag: string }) {
  const [tags, setTags] = useState<Record<string, string>>(saved);
  const [draft, setDraft] = useState<Record<string, string>>(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dirty = stores.some((s) => (draft[s.code] ?? '').trim() !== (tags[s.code] ?? ''));

  const save = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const next = await api.put<Record<string, string>>('/api/admin/amazon-tags', draft);
      setTags(next);
      setDraft(next);
      setMessage('Saved. Ads pick the new ids up within moments.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the ids.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold">Amazon tracking ids</h2>
      <p className="mt-1 text-sm text-subtle">
        Stores marked Global Earning (Canada, UK, Germany, France, Italy, Spain, Netherlands, Poland, Sweden) earn under the US id with no setup, and amazon.com
        product ads are sent to those shoppers&apos; local store by Amazon. Leave their field empty unless you made a separate id. Other countries, like Japan,
        are separate Associates programs: their ads are served once they have an id here and ads in the <code>Ad</code> table.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-subtle">
            <tr>
              <th className="py-1 pr-3 font-medium">Store</th>
              <th className="py-1 pr-3 font-medium">Tracking id</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <td className="py-1.5 pr-3">
                United States <span className="text-xs text-subtle">{`amazon.com`}</span>
              </td>
              <td className="py-1.5 pr-3 font-mono text-xs">{usTag}</td>
              <td className="py-1.5 text-xs text-subtle">Fixed in the code</td>
            </tr>
            {stores.map((store) => {
              const state = status(tags[store.code] ?? '', store.ads, store.global);
              return (
                <tr key={store.code} className="border-t border-line">
                  <td className="py-1.5 pr-3">
                    <label htmlFor={`tag-${store.code}`}>
                      {store.name} <span className="text-xs text-subtle">{store.host.replace(/^www\./, '')}</span>
                      {store.global ? <span className="ml-1 rounded bg-raised px-1 text-[10px] text-subtle">Global Earning</span> : null}
                    </label>
                  </td>
                  <td className="py-1.5 pr-3">
                    <input
                      id={`tag-${store.code}`}
                      value={draft[store.code] ?? ''}
                      onChange={(e) => setDraft({ ...draft, [store.code]: e.target.value })}
                      disabled={busy}
                      placeholder={store.global ? usTag : 'yourname-22'}
                      spellCheck={false}
                      autoComplete="off"
                      className="w-44 rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className={`py-1.5 text-xs ${state.tone}`}>{state.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy || !dirty} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          Save ids
        </button>
        {message ? <p className="text-sm text-success" role="status">{message}</p> : null}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
