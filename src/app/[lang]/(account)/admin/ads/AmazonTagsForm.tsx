'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client/api';

export type StoreRow = { code: string; name: string; host: string; ads: number; global: boolean; missed: number };

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
  const missedTotal = stores.reduce((sum, s) => sum + s.missed, 0);
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
    <details className="group mt-6 rounded-xl border border-line bg-panel p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold [&::-webkit-details-marker]:hidden">
        <h2>
          Amazon tracking ids
          {missedTotal ? <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-xs font-normal text-danger">{missedTotal} missed click{missedTotal === 1 ? '' : 's'}</span> : null}
        </h2>
        <span aria-hidden className="text-xs text-subtle transition-transform group-open:rotate-180">▼</span>
      </summary>
      <p className="mt-2 text-sm text-subtle">
        Stores marked Global Earning (Canada, UK, Germany, France, Italy, Spain, Netherlands, Poland, Sweden) earn under the US id with no setup, and amazon.com
        product ads are sent to those shoppers&apos; local store by Amazon. Leave their field empty unless you made a separate id. Other countries, like Japan,
        are separate Associates programs: their ads are served once they have an id here and ads in the <code>Ad</code> table.
      </p>
      {missedTotal ? (
        <p className="mt-2 text-sm">
          <span className="font-medium">Missed opportunity:</span> {missedTotal} click{missedTotal === 1 ? '' : 's'} from shoppers whose own Amazon store is a separate
          program went to amazon.com instead, because that store had no id ({stores.filter((s) => s.missed).map((s) => `${s.name} ${s.missed}`).join(', ')}).
        </p>
      ) : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-subtle">
            <tr>
              <th className="py-1 pr-3 font-medium">Store</th>
              <th className="py-1 pr-3 font-medium">Tracking id</th>
              <th className="py-1 pr-3 font-medium" title="Clicks from shoppers in this store's country that were sent to amazon.com">Missed clicks</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-line">
              <td className="py-1.5 pr-3">
                United States <span className="text-xs text-subtle">{`amazon.com`}</span>
              </td>
              <td className="py-1.5 pr-3 font-mono text-xs">{usTag}</td>
              <td className="py-1.5 pr-3 text-xs text-subtle">–</td>
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
                  <td className={`py-1.5 pr-3 text-xs ${store.missed ? 'font-medium text-danger' : 'text-subtle'}`}>{store.missed || '–'}</td>
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
    </details>
  );
}
