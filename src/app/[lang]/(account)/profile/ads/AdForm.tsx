'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AdPreview } from '@/components/ads/AdBlock';
import { useRouter } from '@/lib/client/navigation';
import { api, ApiError } from '@/lib/client/api';
import {
  BODY_MAX,
  creativeProblem,
  CUSTOM_MAX,
  CUSTOM_MIN,
  CUSTOM_RATE_CENTS,
  CUSTOM_STEP,
  dollars,
  packageFor,
  perThousand,
  SPONSORED_PACKAGES,
  TITLE_MAX,
} from '@/lib/sponsoredAds';

type Initial = { id: number; title: string; body: string; url: string; impressions: number; imageUrl: string | null };

// Write the ad, pick a package and pay. The ad is saved as a draft first
// (so a closed tab loses nothing), then the picture is sent, then Stripe's
// page opens; it goes to review once the payment arrives.
export function AdForm({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [url, setUrl] = useState(initial?.url ?? 'https://');
  const isFixed = (n: number) => SPONSORED_PACKAGES.some((p) => p.impressions === n);
  const [custom, setCustom] = useState(initial ? !isFixed(initial.impressions) : false);
  const [fixed, setFixed] = useState<number>(initial && isFixed(initial.impressions) ? initial.impressions : SPONSORED_PACKAGES[0].impressions);
  const [customImpressions, setCustomImpressions] = useState<number>(initial && !isFixed(initial.impressions) ? initial.impressions : CUSTOM_MIN);
  const impressions = custom ? customImpressions : fixed;
  const [picture, setPicture] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const priced = packageFor(impressions);
  const price = priced?.priceCents ?? 0;
  // A chosen file is shown from the browser's own copy until it is uploaded.
  const chosenUrl = useMemo(() => (picture ? URL.createObjectURL(picture) : null), [picture]);
  useEffect(
    () => () => {
      if (chosenUrl) URL.revokeObjectURL(chosenUrl);
    },
    [chosenUrl],
  );
  const preview = chosenUrl ?? initial?.imageUrl ?? null;
  // Until something is typed or picked the preview is a sample ad, so the
  // advertiser sees what they are making; the first keystroke or picture
  // replaces it with their own ad, drawn live.
  const untouched = !title.trim() && !body.trim() && (!url.trim() || url.trim() === 'https://') && !preview;

  async function save(payNow: boolean) {
    const problem = creativeProblem({ title, body, url });
    if (problem) return setError(problem);
    if (!priced) return setError(`Custom ads start at ${CUSTOM_MIN.toLocaleString('en-US')} impressions, in steps of ${CUSTOM_STEP.toLocaleString('en-US')}.`);
    setBusy(true);
    setError('');
    try {
      const fields = { title, body, url, impressions };
      const saved = initial ? await api.patch<{ id: number }>(`/api/advertise/ads/${initial.id}`, fields) : await api.post<{ id: number }>('/api/advertise/ads', fields);
      if (picture) {
        const form = new FormData();
        form.append('picture', picture);
        await api.put(`/api/advertise/ads/${saved.id}/image`, form);
      }
      if (payNow) {
        const { url: checkout } = await api.post<{ url: string }>(`/api/advertise/ads/${saved.id}/checkout`, {});
        window.location.assign(checkout);
        return;
      }
      router.push('/profile/ads');
      router.refresh();
      setBusy(false);
    } catch (err) {
      setError(
        err instanceof ApiError && (err.body as { code?: string } | null)?.code === 'emailUnverified'
          ? 'Confirm your email address first, then come back.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong.',
      );
      setBusy(false);
    }
  }

  // Drawn by the markup the live ads use (AdPreview), the two layouts stacked
  // as in the saved ads below. Until something is typed or picked it is a
  // sample ad; the first keystroke or picture replaces it with the advertiser's
  // own, drawn live.
  const previewNode = (
    <div className="space-y-2">
      {untouched ? <p className="text-xs font-medium text-subtle">Example. Start typing and this becomes your ad.</p> : null}
      <AdPreview
        title={untouched ? 'Sample Bagel Shop' : title}
        body={untouched ? 'Fresh bagels baked every morning, a block from the park.' : body}
        url={untouched ? 'https://example.com' : url}
        imageUrl={untouched ? '/ads/example-bagels.png' : preview}
      />
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
      <form
        className="surface space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
        noValidate
      >
        <h2 className="font-display text-xl font-semibold">{initial ? 'Edit your ad' : 'Create an ad'}</h2>

        {/* Below the wide layout the preview sits at the head of the form. */}
        <div className="lg:hidden">{previewNode}</div>

        <div>
          <label htmlFor="ad-title" className="field-label">
            Headline
          </label>
          <input id="ad-title" className="field" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
          <p className="mt-1 text-xs text-subtle">
            {title.length}/{TITLE_MAX}
          </p>
        </div>
        <div>
          <label htmlFor="ad-body" className="field-label">
            Text (optional)
          </label>
          <input id="ad-body" className="field" value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} />
          <p className="mt-1 text-xs text-subtle">
            {body.length}/{BODY_MAX}
          </p>
        </div>
        <div>
          <label htmlFor="ad-url" className="field-label">
            Link
          </label>
          <input id="ad-url" type="url" className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
          <p className="mt-1 text-xs text-subtle">Where people go when they click. Must start with https://.</p>
        </div>
        <div>
          <span className="field-label">Picture (optional)</span>
          <div className="flex items-center gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview or our own blob host
              <img src={preview} alt="" className="size-16 rounded object-cover" />
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              {preview ? 'Change picture' : 'Choose picture'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => setPicture(e.target.files?.[0] ?? null)} />
          </div>
          <p className="mt-1 text-xs text-subtle">Shown square. JPEG, PNG or GIF, up to 5 MB.</p>
        </div>
        <fieldset>
          <legend className="field-label">Package</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {SPONSORED_PACKAGES.map((pkg) => (
              <label key={pkg.impressions} className={`surface flex cursor-pointer items-center gap-3 p-4 ${!custom && fixed === pkg.impressions ? 'ring-2 ring-accent' : ''}`}>
                <input
                  type="radio"
                  name="package"
                  className="accent-accent"
                  checked={!custom && fixed === pkg.impressions}
                  onChange={() => {
                    setCustom(false);
                    setFixed(pkg.impressions);
                  }}
                />
                <span>
                  <span className="block font-semibold">{pkg.impressions.toLocaleString('en-US')} impressions</span>
                  <span className="block text-sm text-subtle">
                    {dollars(pkg.priceCents)} &middot; {perThousand(pkg)} per 1,000
                  </span>
                </span>
              </label>
            ))}
            <label className={`surface flex cursor-pointer items-start gap-3 p-4 sm:col-span-2 ${custom ? 'ring-2 ring-accent' : ''}`}>
              <input type="radio" name="package" className="mt-1 accent-accent" checked={custom} onChange={() => setCustom(true)} />
              <span className="flex-1">
                <span className="block font-semibold">Custom: {CUSTOM_MIN.toLocaleString('en-US')} impressions or more</span>
                <span className="block text-sm text-subtle">
                  {dollars(CUSTOM_RATE_CENTS)} per 1,000{custom && priced ? ` · ${dollars(price)} total` : ''}
                </span>
                {custom ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={CUSTOM_MIN}
                    max={CUSTOM_MAX}
                    step={CUSTOM_STEP}
                    className="field mt-2 max-w-48"
                    aria-label="Number of impressions"
                    value={customImpressions}
                    onChange={(e) => setCustomImpressions(Number(e.target.value))}
                  />
                ) : null}
              </span>
            </label>
          </div>
        </fieldset>

        <p className="text-sm text-subtle">
          Every ad is reviewed before it goes live (usually within a day). If it is turned down, you are refunded. Ads that are misleading, adult, illegal or that take people to a
          page that is not what the ad says are not accepted.
        </p>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? 'Working…' : priced ? `Pay ${dollars(price)} and submit` : 'Choose a size'}
          </button>
          <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => void save(false)}>
            Save for later
          </button>
        </div>
      </form>
      {/* On a wide screen the preview has a column of its own, and stays where it
        is while the page scrolls, so the form passing beside it never covers it. */}
      <aside aria-label="Preview of your ad" aria-live="polite" className="sticky top-[4.75rem] hidden lg:block">
        {previewNode}
      </aside>
    </div>
  );
}
