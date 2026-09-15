'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PinCard } from '@/components/pin/PinCard';
import { Icon } from '@/components/ui/Icon';
import { blobUrl } from '@/lib/appConfig';
import { CATEGORIES } from '@/lib/categories';
import { api, ApiError } from '@/lib/client/api';
import { safeHtmlInBrowser } from '@/lib/client/sanitize';
import { useSession } from '@/lib/client/session';
import { useTimeZone } from '@/lib/client/timeZone';
import { isLowConfidence } from '@/lib/dateClaims';
import { applyScrape, EMPTY_FORM, formDates, formToPin, pinToForm, type PinFormValues, type ReferenceFormValues } from '@/lib/pinForm';
import { pinConfidence, pinEvidence } from '@/lib/referenceConfidence';
import { pinPath } from '@/lib/seo';
import type { CardPin, MediumJson, PinJson } from '@/lib/types';
import { RichTextEditor } from './RichTextEditor';

const CONFIDENCE_LEVELS = ['confirmed', 'scheduled', 'estimated', 'delayed', 'unknown'];

const inputClass = 'field';
const labelClass = 'field-label';

// Create, edit or respond to a pin. Pasting a source URL reads the page and
// fills in whatever the author has not already typed.
export function PinForm({ mode, pin, respondTo }: { mode: 'create' | 'edit' | 'respond'; pin?: PinJson; respondTo?: PinJson }) {
  const router = useRouter();
  const { user } = useSession();
  const [values, setValues] = useState<PinFormValues>(() =>
    pin ? pinToForm(pin) : { ...EMPTY_FORM, parentId: respondTo?.id },
  );
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(mode === 'edit');
  const timeZone = useTimeZone('');

  useEffect(() => {
    api
      .get<{ id: number; name: string }[]>('/api/companies')
      .then(setCompanies)
      .catch(() => {});
  }, []);

  const set = <K extends keyof PinFormValues>(key: K, value: PinFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  // A paste and the blur after it would otherwise read the page twice.
  const lastScraped = useRef('');
  async function scrape(url: string, { onlyMedia = false } = {}) {
    if (!/^https?:\/\//i.test(url.trim())) return;
    if (!onlyMedia && mode !== 'edit' && lastScraped.current === url.trim()) return;
    lastScraped.current = url.trim();
    setScraping(true);
    setScrapeError('');
    try {
      const scraped = await api.get<Partial<PinJson>>(`/api/scrape?url=${encodeURIComponent(url.trim())}`);
      setValues((v) => (onlyMedia ? applyScrape(v, { media: scraped.media }) : applyScrape(v, scraped)));
    } catch (err) {
      setScrapeError(err instanceof ApiError ? `Could not read that page (${err.status}).` : 'Could not read that page.');
    } finally {
      setScraping(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!values.title.trim()) return setError('A title is required.');
    if (!values.startDate) return setError('A start date is required.');
    if (!values.sourceUrl.trim() && mode !== 'edit') return setError('A source URL is required.');
    if (values.priceCurrency && !/^[A-Za-z]{3}$/.test(values.priceCurrency)) return setError('Currency must be a 3-letter code, like USD.');
    for (const r of values.references) {
      if (!r.url.trim() && !r.title.trim() && !r.confidence) continue;
      if (!/^https?:\/\//i.test(r.url.trim())) return setError('Each reference needs a link starting with http:// or https://.');
      const confidence = Number(r.confidence);
      if (r.confidence.trim() === '' || isNaN(confidence) || confidence < 0 || confidence > 100) return setError('Each reference needs a confidence from 0 to 100.');
      if (r.startDate && r.endDate && r.endDate < r.startDate) return setError("A reference's end date cannot be before its start date.");
    }

    setSaving(true);
    try {
      const body = formToPin(values);
      const saved = mode === 'edit' ? await api.put<PinJson>(`/api/pins/${values.id}`, body) : await api.post<PinJson>('/api/pins', body);
      router.push(pinPath(saved));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'You can only edit your own pins.' : 'There was a problem saving this pin.');
      setSaving(false);
    }
  }

  const preview = useMemo<CardPin>(() => {
    const body = formToPin(values);
    return {
      ...body,
      id: values.id ?? 0,
      title: body.title || 'Preview your pin',
      utcStartDateTime: body.utcStartDateTime || '',
      utcCreatedDateTime: pin?.utcCreatedDateTime,
      user: user ? { id: user.id, userName: user.userName, pictureUrl: user.pictureUrl } : undefined,
      media: body.media,
      safeDescription: safeHtmlInBrowser(values.description),
    } as unknown as CardPin;
  }, [values, user, pin?.utcCreatedDateTime]);

  const picked = useMemo(() => formDates(values), [values]);

  const title = mode === 'edit' ? 'Edit Pin' : mode === 'respond' ? 'Respond to Pin' : 'Create Pin';

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[1fr_420px]" noValidate>
      <fieldset disabled={saving} className="min-w-0 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

        {respondTo ? (
          <div>
            <span className={labelClass}>Responding to</span>
            <Link href={pinPath(respondTo)}>{respondTo.title}</Link>
          </div>
        ) : null}

        <div>
          <label htmlFor="sourceUrl" className={labelClass}>
            Source URL {scraping ? <span className="font-normal text-subtle">(Analyzing page…)</span> : null}
          </label>
          <div className="flex gap-2">
            <input
              id="sourceUrl"
              type="url"
              required={mode !== 'edit'}
              placeholder="https://www.example.com"
              className={inputClass}
              value={values.sourceUrl}
              onChange={(e) => set('sourceUrl', e.target.value)}
              onBlur={(e) => mode !== 'edit' && !values.title && scrape(e.target.value)}
              onPaste={(e) => mode !== 'edit' && scrape(e.clipboardData.getData('text'))}
            />
            {values.sourceUrl ? (
              <a href={values.sourceUrl} target="_blank" rel="noopener" className="self-center text-sm whitespace-nowrap">
                Open link
              </a>
            ) : null}
          </div>
          {scrapeError ? <p className="mt-1 text-sm text-warning">{scrapeError}</p> : null}
          {mode === 'edit' ? (
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => scrape(values.sourceUrl)} disabled={scraping}>
                Scrape
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => scrape(values.sourceUrl, { onlyMedia: true })} disabled={scraping}>
                Scrape image
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input id="title" required maxLength={180} className={inputClass} value={values.title} onChange={(e) => set('title', e.target.value)} placeholder="Add your title" />
        </div>

        <div>
          <span className={labelClass}>Content</span>
          <RichTextEditor value={values.description} onChange={(html) => set('description', html)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className={labelClass}>
              Start
            </label>
            <div className="flex gap-2">
              <input id="startDate" type="date" required className={inputClass} value={values.startDate} onChange={(e) => set('startDate', e.target.value)} />
              {!values.allDay ? <input aria-label="Start time" type="time" step={900} className={inputClass} value={values.startTime} onChange={(e) => set('startTime', e.target.value)} /> : null}
            </div>
          </div>
          <div>
            <label htmlFor="endDate" className={labelClass}>
              End <span className="font-normal text-subtle">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input id="endDate" type="date" min={values.startDate} className={inputClass} value={values.endDate} onChange={(e) => set('endDate', e.target.value)} />
              {!values.allDay ? <input aria-label="End time" type="time" step={900} className={inputClass} value={values.endTime} onChange={(e) => set('endTime', e.target.value)} /> : null}
            </div>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <button type="button" className="text-link" onClick={() => set('allDay', !values.allDay)}>
            {values.allDay ? 'Add time' : 'Remove time'}
          </button>
          <span className="text-subtle">{values.allDay ? 'All day' : timeZone}</span>
        </div>
        {picked.overridden ? <OverriddenDates picked={picked} allDay={values.allDay} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <select id="category" className={inputClass} value={values.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="company" className={labelClass}>
              Company
            </label>
            <input id="company" list="company-options" className={inputClass} value={values.company} onChange={(e) => set('company', e.target.value)} placeholder="Apple, SpaceX, City of Detroit…" />
            <datalist id="company-options">
              {companies.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label htmlFor="price" className={labelClass}>
            Cost
          </label>
          <div className="flex gap-2">
            <input aria-label="Currency" maxLength={3} placeholder="USD" className={`${inputClass} w-20 uppercase`} value={values.priceCurrency} onChange={(e) => set('priceCurrency', e.target.value.toUpperCase())} />
            <input id="price" type="number" step="0.01" placeholder="Cost (optional)" className={inputClass} value={values.price} onChange={(e) => set('price', e.target.value)} />
            {[
              ['K', 1e3],
              ['M', 1e6],
              ['B', 1e9],
              ['T', 1e12],
            ].map(([label, factor]) => (
              <button
                key={label}
                type="button"
                className="btn btn-secondary px-3"
                onClick={() => set('price', values.price ? String(Number(values.price) * (factor as number)) : '')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Where to buy</span>
          {values.merchants.map((merchant, index) => (
            <div key={index} className="mb-2 grid grid-cols-[6rem_1fr_2fr_auto] gap-2">
              <input
                aria-label="Merchant price"
                type="number"
                step="0.01"
                placeholder="Price"
                className={inputClass}
                value={merchant.price ?? ''}
                onChange={(e) => set('merchants', values.merchants.map((m, i) => (i === index ? { ...m, price: e.target.value === '' ? undefined : Number(e.target.value) } : m)))}
              />
              <input
                aria-label="Merchant label"
                placeholder="Amazon"
                className={inputClass}
                value={merchant.label ?? ''}
                onChange={(e) => set('merchants', values.merchants.map((m, i) => (i === index ? { ...m, label: e.target.value } : m)))}
              />
              <input
                aria-label="Merchant URL"
                type="url"
                placeholder="https://www.merchant.com/…"
                className={inputClass}
                value={merchant.url ?? ''}
                onChange={(e) => set('merchants', values.merchants.map((m, i) => (i === index ? { ...m, url: e.target.value } : m)))}
              />
              <button type="button" aria-label="Remove merchant" className="rounded-lg px-2 text-subtle hover:bg-red-500/10 hover:text-danger" onClick={() => set('merchants', values.merchants.filter((_, i) => i !== index))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-ghost -ml-2 text-link" onClick={() => set('merchants', [...values.merchants, { label: '', url: '' }])}>
            Add a merchant
          </button>
        </div>

        <ReferencesEditor
          references={values.references}
          source={{ sourceUrl: values.sourceUrl, dateConfidence: values.dateConfidence, utcCreatedDateTime: pin?.utcCreatedDateTime }}
          onChange={(references) => set('references', references)}
        />

        <details open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)} className="group surface p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
            <Icon name="chevron" className="size-4 -rotate-90 text-subtle transition-transform group-open:rotate-0" />
            Location, date confidence and summary
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="address" className={labelClass}>
                Place
              </label>
              <input id="address" className={inputClass} value={values.address} onChange={(e) => set('address', e.target.value)} placeholder="Detroit, Michigan" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="Latitude" type="number" step="any" min={-90} max={90} placeholder="Latitude" className={inputClass} value={values.latitude} onChange={(e) => set('latitude', e.target.value)} />
              <input aria-label="Longitude" type="number" step="any" min={-180} max={180} placeholder="Longitude" className={inputClass} value={values.longitude} onChange={(e) => set('longitude', e.target.value)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[13rem_1fr]">
              <select aria-label="Date confidence" className={inputClass} value={values.dateConfidence} onChange={(e) => set('dateConfidence', e.target.value)}>
                <option value="">Date confidence</option>
                {CONFIDENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <input aria-label="Why" placeholder="Why (quote the source)" className={inputClass} value={values.dateConfidenceReasoning} onChange={(e) => set('dateConfidenceReasoning', e.target.value)} />
            </div>
            <div>
              <label htmlFor="summary" className={labelClass}>
                Key points (HTML list)
              </label>
              <textarea id="summary" rows={5} className={`${inputClass} font-mono text-xs`} value={values.longFormSummary} onChange={(e) => set('longFormSummary', e.target.value)} />
            </div>
          </div>
        </details>

        {values.media.length ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className={labelClass}>Heading image</span>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={values.useMedia} onChange={(e) => set('useMedia', e.target.checked)} />
                Use heading image
              </label>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {values.media.map((medium, index) => (
                <li key={medium.originalUrl ?? index}>
                  <MediaChoice medium={medium} selected={medium.originalUrl === values.selectedMedia?.originalUrl} onSelect={() => set('selectedMedia', medium)} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-danger-soft ring-1 ring-red-500/20 ring-inset">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-line pt-5">
          <button type="button" onClick={() => router.back()} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary px-6" disabled={saving}>
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </fieldset>

      <aside className="lg:sticky lg:top-[64px] lg:self-start">
        <span className={labelClass}>Preview</span>
        <PinCard pin={preview} serverTimeZone="UTC" />
      </aside>
    </form>
  );
}

function ReferencesEditor({
  references,
  source,
  onChange,
}: {
  references: ReferenceFormValues[];
  source: Pick<PinJson, 'sourceUrl' | 'dateConfidence' | 'utcCreatedDateTime'>;
  onChange: (references: ReferenceFormValues[]) => void;
}) {
  const update = (index: number, patch: Partial<ReferenceFormValues>) => onChange(references.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const overall = pinConfidence(
    pinEvidence({
      ...source,
      references: references
        .filter((r) => r.url.trim() && r.confidence.trim() !== '' && !isNaN(Number(r.confidence)))
        .map((r) => ({ ...r, url: r.url.trim(), confidence: Number(r.confidence) })),
    }),
  );
  return (
    <div>
      <span className={labelClass}>
        References{' '}
        <span className="font-normal text-subtle">
          {overall !== undefined ? `(overall confidence ${overall}% with the source, newer references count more)` : '(further evidence for this pin; the source counts too)'}
        </span>
      </span>
      {references.map((reference, index) => {
        // Only the link is editable: the rest is what the page was assessed as
        // saying, and comes from the scrape rather than being typed.
        const facts = [
          reference.title,
          reference.confidence && `${reference.confidence}% confidence`,
          reference.publishedDate && `published ${formatDay(reference.publishedDate)}`,
          reference.startDate && `starts ${formatDay(reference.startDate)}`,
          reference.endDate && `ends ${formatDay(reference.endDate)}`,
        ].filter(Boolean);
        return (
          <div key={index} className="mb-3">
            <div className="flex gap-2">
              <input aria-label="Reference URL" type="url" placeholder="https://…" className={inputClass} value={reference.url} onChange={(e) => update(index, { url: e.target.value })} />
              <button type="button" aria-label="Remove reference" className="rounded-lg px-2 text-subtle hover:bg-red-500/10 hover:text-danger" onClick={() => onChange(references.filter((_, i) => i !== index))}>
                ✕
              </button>
            </div>
            {facts.length > 0 && <p className="mt-1 text-xs text-subtle">{facts.join(' · ')}</p>}
            {reference.reasoning && <p className="mt-1 text-xs text-subtle">{reference.reasoning}</p>}
          </div>
        );
      })}
    </div>
  );
}

const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const formatDay = (ymd: string) => dayFormat.format(new Date(`${ymd}T00:00:00Z`));

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// What the pin is saved with when a more confident reference's dates win over
// the ones typed above (which stay as the source's dates).
function OverriddenDates({ picked, allDay }: { picked: ReturnType<typeof formDates>; allDay: boolean }) {
  const { utcStartDateTime: start, utcEndDateTime: end } = picked.dates;
  if (!start) return null;
  const when = (value: string, isEnd = false) =>
    allDay
      ? formatDay(new Date(new Date(value).getTime() - (isEnd ? 86400000 : 0)).toISOString().slice(0, 10))
      : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const by = [picked.startFrom && ['start', picked.startFrom], picked.endFrom && ['end', picked.endFrom]].filter(Boolean) as [string, { url: string; confidence: number }][];
  return (
    <p className="-mt-2 rounded-lg bg-link/10 px-3 py-2 text-sm text-muted ring-1 ring-link/20 ring-inset">
      Saved as <span className="font-medium text-ink">{when(start)}{end ? ` – ${when(end, true)}` : ''}</span>
      {by.length ? (
        <>
          {' '}
          from the most confident {by.map(([side, r], i) => (
            <span key={side}>
              {i ? ' and ' : ''}
              {side} ({hostOf(r.url)}, {r.confidence}%{isLowConfidence(r.confidence) ? <span className="text-warning-soft"> - low confidence</span> : null})
            </span>
          ))}
        </>
      ) : null}
      . The dates above are kept as the source&apos;s.
    </p>
  );
}

function MediaChoice({ medium, selected, onSelect }: { medium: MediumJson; selected: boolean; onSelect: () => void }) {
  const src = medium.thumbName ? blobUrl(medium.thumbName) : medium.originalUrl;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`block w-full overflow-hidden rounded-lg ring-2 transition-shadow ${selected ? 'ring-link' : 'ring-transparent hover:ring-raised-2'}`}
      title={medium.originalWidth ? `${medium.originalWidth} × ${medium.originalHeight}` : undefined}
    >
      {String(medium.type) === '1' && src ? (
        // eslint-disable-next-line @next/next/no-img-element -- candidate images on arbitrary hosts
        <img src={src} alt="" className="aspect-video w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex aspect-video items-center justify-center bg-raised text-sm text-ink">{String(medium.type) === '2' ? 'Tweet' : 'Video'}</span>
      )}
    </button>
  );
}
