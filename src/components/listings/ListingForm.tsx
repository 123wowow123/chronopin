'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api, ApiError, isEmailUnverified } from '@/lib/client/api';
import { useLocale, useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';
import type { Translator } from '@/lib/i18n/translate';
import {
  DETAIL_FIELDS,
  hasTitleField,
  hasVideo,
  itemCategoryFor,
  listingProblem,
  needsPhoto,
  PHOTO_LIMIT,
  PHOTO_MAX_BYTES,
  storedTitle,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_SECONDS,
  type ListingDetails,
  type ListingField,
  type ListingInput,
  type ListingJson,
  type ListingKind,
  type ListingPlace,
  type ListingProblem,
} from '@/lib/listings';
import { userLocation } from '@/lib/location';
import { Dialog, fieldLabel, listingTitle, mediaUrl, optionLabel, priceLine } from './parts';

// Where each kind's form puts its fields, as Marketplace orders them. A
// string is one field (the listing's own or one of DETAIL_FIELDS); a group is
// a headed section, folded shut when `folded`.
type Group = { section: string; fields: string[]; optional?: boolean; folded?: boolean };
const LAYOUT: Record<ListingKind, (string | Group)[]> = {
  item: ['photos', 'title', 'price', 'category', 'condition', 'description', { section: 'moreDetails', fields: ['brand', 'color'], folded: true }, 'location'],
  vehicle: [
    'vin',
    'vehicleType',
    'photos',
    {
      section: 'aboutVehicle',
      fields: ['location', 'year', 'make', 'model', 'mileage', 'price', 'bodyStyle', 'exteriorColor', 'interiorColor', 'cleanTitle', 'vehicleCondition', 'fuelType', 'transmission'],
    },
    'description',
  ],
  home: [
    'photos',
    'offer',
    'propertyType',
    'bedrooms',
    'bathrooms',
    'price',
    'location',
    'description',
    { section: 'advancedDetails', fields: ['squareFeet', 'laundry', 'parking', 'airConditioning', 'heating'], optional: true },
  ],
  job: ['title', 'description', 'jobCategory', 'jobType', 'payType', 'payRange', 'location', 'locationType', 'photos', { section: 'benefits', fields: ['benefits'] }],
};

const SEARCH_DELAY_MS = 300;

type Values = { title: string; price: string; description: string; details: ListingDetails; photos: string[]; video: string | null; location: ListingPlace | null };

const toInput = (v: Values): ListingInput => ({
  title: v.title,
  price: v.price.trim() === '' ? null : Number(v.price),
  description: v.description,
  details: v.details,
  photos: v.photos,
  video: v.video,
  location: v.location,
});

function problemText(t: Translator, kind: ListingKind, problem: ListingProblem) {
  const field = problem.field === 'price' ? priceFieldLabel(t, kind) : fieldLabel(t, problem.field);
  return t.dynamic(`listing.problem.${problem.code}`, problem.code, { field, count: PHOTO_LIMIT[kind] });
}

const priceFieldLabel = (t: Translator, kind: ListingKind) => (kind === 'job' ? t('listing.fields.minPay') : kind === 'home' ? t('listing.fields.homePrice') : fieldLabel(t, 'price'));

// How long a video runs, read by the browser before it is sent.
function videoSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(Number.NaN);
    };
    video.src = url;
  });
}

// The "Sell this item here" popup: the form for the pin's one kind of
// listing beside a preview of how it will look, as Marketplace has it. Also
// the seller's edit of a listing (`listing`).
export function ListingForm({
  pinId,
  kind,
  productName,
  categories,
  listing,
  onClose,
  onSaved,
}: {
  pinId: number;
  kind: ListingKind;
  productName?: string | null;
  categories?: string[];
  listing?: ListingJson;
  onClose: () => void;
  onSaved: (listing: ListingJson) => void;
}) {
  const t = useT();
  const { user } = useSession();
  const [values, setValues] = useState<Values>(() =>
    listing
      ? {
          title: listing.title,
          price: listing.price == null ? '' : String(listing.price),
          description: listing.description,
          details: listing.details,
          photos: listing.photos,
          video: listing.video,
          location: listing.location,
        }
      : {
          title: hasTitleField(kind) ? (productName ?? '') : '',
          price: '',
          description: '',
          details: kind === 'item' && itemCategoryFor(categories) ? { category: itemCategoryFor(categories)! } : {},
          photos: [],
          video: null,
          location: null,
        },
  );
  const [problem, setProblem] = useState<ListingProblem | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const scroller = useRef<HTMLDivElement>(null);

  // A new listing starts at the seller's default location.
  const home = userLocation(user);
  const location = values.location ?? (listing ? null : home);

  const set = (patch: Partial<Values>) => {
    setValues((v) => ({ ...v, ...patch }));
    setProblem(null);
  };
  const setDetail = (name: string, value: ListingDetails[string] | undefined) =>
    setValues((v) => {
      const details = { ...v.details };
      if (value === undefined || value === '' || value === false || (Array.isArray(value) && !value.length)) delete details[name];
      else details[name] = value;
      setProblem(null);
      return { ...v, details };
    });

  async function upload(files: File[], type: 'photo' | 'video') {
    setError('');
    const room = type === 'video' ? (values.video ? 0 : 1) : PHOTO_LIMIT[kind] - values.photos.length;
    const chosen = files.filter((f) => (type === 'video' ? f.type.startsWith('video/') : f.type.startsWith('image/'))).slice(0, room);
    if (files.length > chosen.length) setError(t(type === 'video' ? 'listing.oneVideo' : 'listing.problem.tooMany', { count: PHOTO_LIMIT[kind] }));
    for (const file of chosen) {
      if (file.size > (type === 'video' ? VIDEO_MAX_BYTES : PHOTO_MAX_BYTES)) {
        setError(t(type === 'video' ? 'listing.videoTooLarge' : 'listing.photoTooLarge'));
        continue;
      }
      if (type === 'video') {
        const seconds = await videoSeconds(file);
        if (!(seconds <= VIDEO_MAX_SECONDS + 0.5)) {
          setError(t('listing.videoTooLong', { seconds: VIDEO_MAX_SECONDS }));
          continue;
        }
      }
      setUploading((n) => n + 1);
      try {
        const form = new FormData();
        form.append('file', file);
        const saved = await api.post<{ name: string; type: 'photo' | 'video' }>('/api/listings/media', form);
        setValues((v) => (saved.type === 'video' ? { ...v, video: saved.name } : { ...v, photos: [...v.photos, saved.name].slice(0, PHOTO_LIMIT[kind]) }));
        setProblem(null);
      } catch (err) {
        setError(isEmailUnverified(err) ? t('listing.verifyFirst') : t('listing.uploadFailed'));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function submit() {
    const input = { ...toInput(values), location };
    const found = listingProblem(kind, input);
    if (found) {
      setProblem(found);
      scroller.current?.querySelector(`[data-field="${found.field === 'maxPay' || found.field === 'price' ? (kind === 'job' ? 'payRange' : found.field) : found.field}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { ...input, kind };
      const saved = listing
        ? await api.put<{ listing: ListingJson }>(`/api/listings/${listing.id}`, body)
        : await api.post<{ listing: ListingJson }>(`/api/pins/${pinId}/listings`, body);
      onSaved(saved.listing);
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { field?: string; code?: ListingProblem['code'] } | null) : null;
      if (isEmailUnverified(err)) setError(t('listing.verifyFirst'));
      else if (body?.field && body.code) setProblem({ field: body.field, code: body.code });
      else setError(t('listing.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const fieldError = (name: string) =>
    problem && (problem.field === name || (name === 'payRange' && (problem.field === 'price' || problem.field === 'maxPay'))) ? (
      <p role="alert" className="mt-1 text-xs text-danger">
        {problemText(t, kind, problem)}
      </p>
    ) : null;
  const invalid = (name: string) => (problem?.field === name ? 'ring-danger ring-2' : '');

  function detailField(field: ListingField) {
    const value = values.details[field.name];
    const label = fieldLabel(t, field.name);
    switch (field.type) {
      case 'select':
        return (
          <select aria-label={label} className={`field py-3 ${value ? '' : 'text-subtle'} ${invalid(field.name)}`} value={(value as string) ?? ''} onChange={(e) => setDetail(field.name, e.target.value || undefined)}>
            <option value="">{label}</option>
            {field.options.map((o) => (
              <option key={o} value={o} className="text-ink">
                {optionLabel(t, field.name, o)}
              </option>
            ))}
          </select>
        );
      case 'text':
        return (
          <input
            aria-label={label}
            placeholder={label}
            className={`field py-3 ${invalid(field.name)}`}
            maxLength={field.max}
            value={(value as string) ?? ''}
            onChange={(e) => setDetail(field.name, e.target.value)}
          />
        );
      case 'number':
        return (
          <input
            aria-label={label}
            placeholder={label}
            type="number"
            inputMode="decimal"
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            className={`field py-3 ${invalid(field.name)}`}
            value={value == null ? '' : String(value)}
            onChange={(e) => setDetail(field.name, e.target.value === '' ? undefined : Number(e.target.value))}
          />
        );
      case 'bool':
        return (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-2 text-sm text-ink">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-accent)]" checked={value === true} onChange={(e) => setDetail(field.name, e.target.checked)} />
            <span>
              {label}
              <span className="block text-xs text-subtle">{t.dynamic(`listing.hints.${field.name}`, '')}</span>
            </span>
          </label>
        );
      case 'multi': {
        const picked = new Set((value as string[] | undefined) ?? []);
        const chip = (on: boolean) => `rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${on ? 'bg-accent/15 text-accent' : 'bg-raised-2 text-ink hover:bg-raised'}`;
        return (
          <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
            <button type="button" aria-pressed={!picked.size} className={chip(!picked.size)} onClick={() => setDetail(field.name, undefined)}>
              {t('listing.options.benefits.none')}
            </button>
            {field.options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={picked.has(o)}
                className={chip(picked.has(o))}
                onClick={() => setDetail(field.name, picked.has(o) ? [...picked].filter((p) => p !== o) : [...picked, o])}
              >
                {optionLabel(t, field.name, o)}
              </button>
            ))}
          </div>
        );
      }
    }
  }

  function field(name: string): ReactNode {
    const detail = DETAIL_FIELDS[kind].find((f) => f.name === name);
    let control: ReactNode;
    let hint: ReactNode = null;
    if (detail) {
      control = detailField(detail);
      if (!('required' in detail && detail.required) && detail.type !== 'bool' && detail.type !== 'multi') hint = t('listing.optional');
      if (name === 'vin') hint = t('listing.hints.vin');
    } else if (name === 'title') {
      const label = kind === 'job' ? t('listing.fields.jobTitle') : fieldLabel(t, 'title');
      control = <input aria-label={label} placeholder={label} className={`field py-3 ${invalid('title')}`} maxLength={150} value={values.title} onChange={(e) => set({ title: e.target.value })} />;
    } else if (name === 'price') {
      const label = priceFieldLabel(t, kind);
      control = (
        <input aria-label={label} placeholder={label} type="number" inputMode="decimal" min={0} step="0.01" className={`field py-3 ${invalid('price')}`} value={values.price} onChange={(e) => set({ price: e.target.value })} />
      );
      if (kind === 'home' && values.details.offer === 'rent') hint = t('listing.hints.rent');
    } else if (name === 'payRange') {
      const max = values.details.maxPay;
      control = (
        <div className="grid grid-cols-2 gap-3">
          <input aria-label={t('listing.fields.minPay')} placeholder={t('listing.fields.minPay')} type="number" inputMode="decimal" min={0} step="0.01" className={`field py-3 ${invalid('price')}`} value={values.price} onChange={(e) => set({ price: e.target.value })} />
          <input
            aria-label={t('listing.fields.maxPay')}
            placeholder={t('listing.fields.maxPay')}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className={`field py-3 ${invalid('maxPay')}`}
            value={max == null ? '' : String(max)}
            onChange={(e) => setDetail('maxPay', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </div>
      );
    } else if (name === 'description') {
      const label = kind === 'job' ? t('listing.fields.jobDescription') : fieldLabel(t, 'description');
      control = (
        <textarea aria-label={label} placeholder={label} rows={4} maxLength={5000} className={`field resize-y py-3 ${invalid('description')}`} value={values.description} onChange={(e) => set({ description: e.target.value })} />
      );
      hint = kind === 'home' ? t('listing.hints.homeDescription') : kind === 'job' ? null : t('listing.optional');
    } else if (name === 'location') {
      control = <PlacePicker value={location} onChange={(place) => set({ location: place })} invalid={problem?.field === 'location'} label={kind === 'home' ? t('listing.fields.homeLocation') : fieldLabel(t, 'location')} />;
    } else if (name === 'photos') {
      control = (
        <MediaPicker
          kind={kind}
          photos={values.photos}
          video={values.video}
          uploading={uploading}
          invalid={problem?.field === 'photos'}
          onAdd={upload}
          onRemove={(which) => set(which === 'video' ? { video: null } : { photos: values.photos.filter((p) => p !== which) })}
        />
      );
    }
    return (
      <div key={name} data-field={name} className="scroll-mt-4">
        {control}
        {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
        {fieldError(name)}
      </div>
    );
  }

  const kindTitle = t(`listing.kinds.${kind}`);
  const preview = { ...toInput(values), location, kind, currency: 'USD', title: storedTitle(kind, toInput(values)) };

  return (
    <Dialog label={kindTitle} onClose={onClose} className="w-full max-w-6xl lg:h-[92dvh]" bare>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-line lg:border-r">
          <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-6">
            <div>
              <p className="text-xs text-subtle">{t('listing.marketplace')}</p>
              <h2 className="text-2xl font-bold text-ink">{listing ? t('listing.editTitle', { kind: kindTitle }) : kindTitle}</h2>
            </div>
            {user ? (
              <div className="flex items-center gap-3">
                <UserAvatar userName={user.userName} pictureUrl={user.pictureUrl} className="size-10 text-sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{user.userName}</div>
                  <div className="flex items-center gap-1 text-xs text-subtle">
                    {t('listing.listingPublic')}
                    <Icon name="globe" className="size-3" />
                  </div>
                </div>
              </div>
            ) : null}
            {LAYOUT[kind].map((entry) => {
              if (typeof entry === 'string') return field(entry);
              const folded = entry.folded && !open[entry.section] && !entry.fields.some((f) => values.details[f] != null || problem?.field === f);
              return (
                <section key={entry.section} className="space-y-3 border-t border-line pt-4">
                  {entry.folded ? (
                    <button type="button" aria-expanded={!folded} onClick={() => setOpen((o) => ({ ...o, [entry.section]: !!folded }))} className="flex w-full items-center gap-2 text-left">
                      <span className="flex-1">
                        <span className="block font-semibold text-ink">{t.dynamic(`listing.sections.${entry.section}`, entry.section)}</span>
                        <span className="block text-sm text-subtle">{t.dynamic(`listing.sectionHints.${entry.section}`, '')}</span>
                      </span>
                      <Icon name="chevron" className={`size-4 text-subtle transition-transform ${folded ? '' : 'rotate-180'}`} />
                    </button>
                  ) : (
                    <div className="flex items-baseline justify-between gap-2">
                      <span>
                        <span className="block font-semibold text-ink">{t.dynamic(`listing.sections.${entry.section}`, entry.section)}</span>
                        <span className="block text-sm text-subtle">{t.dynamic(`listing.sectionHints.${entry.section}`, '')}</span>
                      </span>
                      {entry.optional ? <span className="text-sm text-subtle">{t('listing.optional')}</span> : null}
                    </div>
                  )}
                  {folded ? null : entry.fields.map((f) => field(f))}
                </section>
              );
            })}
            {kind === 'job' ? (
              <div className="flex gap-3 rounded-xl bg-raised p-3 text-sm text-muted">
                <Icon name="info" className="mt-0.5 size-4 shrink-0 text-link" />
                <p>{t('listing.jobTerms')}</p>
              </div>
            ) : null}
            <p className="text-xs text-subtle">{t(kind === 'job' ? 'listing.jobPolicy' : 'listing.policy')}</p>
          </div>
          <div className="border-t border-line p-4">
            {error ? (
              <p role="alert" className="mb-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <button type="button" onClick={() => void submit()} disabled={saving || uploading > 0} className="btn btn-primary w-full py-2.5">
              {saving ? t('listing.saving') : listing ? t('listing.save') : t('listing.publish')}
            </button>
          </div>
        </div>
        <ListingPreview t={t} listing={preview} seller={user ? { userName: user.userName, pictureUrl: user.pictureUrl ?? null } : null} />
      </div>
    </Dialog>
  );
}

type PreviewListing = ListingInput & { kind: ListingKind; currency: string };

// How the listing will look, as it is written: the first photo on the left,
// the words on the right.
function ListingPreview({ t, listing, seller }: { t: Translator; listing: PreviewListing; seller: { userName: string; pictureUrl: string | null } | null }) {
  const title = listingTitle(t, listing);
  const price = priceLine(t, listing);
  const facts = DETAIL_FIELDS[listing.kind].filter((f) => listing.details[f.name] != null && f.name !== 'maxPay');
  const photo = listing.photos[0];
  return (
    <div className="hidden min-h-0 flex-col bg-page p-5 lg:flex">
      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden shadow-sm">
        <p className="px-4 pt-3 pb-2 text-sm font-semibold text-ink">{t('listing.preview')}</p>
        <div className="mx-4 mb-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] overflow-hidden rounded-lg ring-1 ring-line">
          <div className="flex items-center justify-center bg-raised">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the seller's upload, sized by the frame
              <img src={mediaUrl(photo)} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="max-w-sm p-6 text-center">
                <p className="text-2xl font-bold text-muted">{t(listing.kind === 'job' ? 'listing.previewJobHeading' : 'listing.previewHeading')}</p>
                <p className="mt-1 text-lg text-subtle">{t(listing.kind === 'job' ? 'listing.previewJobHint' : 'listing.previewHint')}</p>
              </div>
            )}
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto p-4">
            <div>
              <p className={`text-2xl font-bold ${title ? 'text-ink' : 'text-subtle'}`}>{title || (listing.kind === 'job' ? t('listing.fields.jobTitle') : fieldLabel(t, 'title'))}</p>
              <p className={`text-lg ${price ? 'font-semibold text-ink' : 'text-subtle'}`}>{price || priceFieldLabel(t, listing.kind)}</p>
              <p className="mt-1 text-xs text-subtle">{listing.location?.name ? t('listing.listedIn', { place: listing.location.name }) : t('listing.listedNow')}</p>
            </div>
            {facts.length ? (
              <div>
                <p className="mb-2 font-semibold text-ink">{t(`listing.about.${listing.kind}`)}</p>
                <ListingFacts t={t} kind={listing.kind} details={listing.details} />
              </div>
            ) : null}
            <div>
              <p className="mb-1 font-semibold text-ink">{t(listing.kind === 'job' ? 'listing.jobDetails' : 'listing.sellerDescription')}</p>
              <p className={`text-sm whitespace-pre-wrap ${listing.description ? 'text-ink' : 'text-subtle'}`}>{listing.description || t('listing.descriptionPlaceholder')}</p>
            </div>
            {listing.location ? (
              <p className="text-xs text-muted">
                <span className="font-medium text-ink">{listing.location.name}</span> · {t('listing.approximate')}
              </p>
            ) : null}
            {seller ? (
              <div className="border-t border-line pt-3">
                <p className="mb-2 font-semibold text-muted">{t('listing.sellerInformation')}</p>
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <UserAvatar userName={seller.userName} pictureUrl={seller.pictureUrl} className="size-10 text-sm" />
                  {seller.userName}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// The details a listing has, one per row: "Condition: Used - like new".
export function ListingFacts({ t, kind, details }: { t: Translator; kind: ListingKind; details: ListingDetails }) {
  const rows = DETAIL_FIELDS[kind].filter((f) => details[f.name] != null && f.name !== 'maxPay');
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
      {rows.map((f) => {
        const value = details[f.name];
        const shown =
          f.type === 'select'
            ? optionLabel(t, f.name, String(value))
            : f.type === 'multi'
              ? (value as string[]).map((v) => optionLabel(t, f.name, v)).join(', ')
              : f.type === 'bool'
                ? t('listing.yes')
                : f.type === 'number'
                  ? new Intl.NumberFormat(t.locale).format(value as number)
                  : String(value);
        return (
          <Fragment key={f.name}>
            <dt className="text-subtle">{fieldLabel(t, f.name)}</dt>
            <dd className="text-ink">{shown}</dd>
          </Fragment>
        );
      })}
    </dl>
  );
}

// Photos (and a video) as tiles, with an add tile that also takes a drop.
function MediaPicker({
  kind,
  photos,
  video,
  uploading,
  invalid,
  onAdd,
  onRemove,
}: {
  kind: ListingKind;
  photos: string[];
  video: string | null;
  uploading: number;
  invalid: boolean;
  onAdd: (files: File[], type: 'photo' | 'video') => void;
  onRemove: (name: string | 'video') => void;
}) {
  const t = useT();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState<'photo' | 'video' | null>(null);
  const limit = PHOTO_LIMIT[kind];
  const video_ = hasVideo(kind);

  const choose = (type: 'photo' | 'video') => (type === 'video' ? videoInput.current : photoInput.current)?.click();

  const tile = (type: 'photo' | 'video') => {
    const full = type === 'video' ? !!video : photos.length >= limit;
    if (full) return null;
    return (
      <button
        type="button"
        onClick={() => choose(type)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(type);
        }}
        onDragLeave={() => setOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(null);
          onAdd([...e.dataTransfer.files], type);
        }}
        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg p-3 text-center ring-1 ring-inset transition-colors ${over === type ? 'bg-accent/10 ring-accent' : invalid && type === 'photo' ? 'ring-2 ring-danger' : 'ring-line hover:bg-raised'} ${kind === 'job' ? 'col-span-2 aspect-[2/1]' : ''}`}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-raised-2 text-ink">
          <Icon name={type === 'video' ? 'play' : 'plus'} className="size-5" />
        </span>
        <span className="font-semibold text-ink">{t(type === 'video' ? 'listing.addVideo' : kind === 'job' ? 'listing.addCover' : 'listing.addPhotos')}</span>
        <span className="text-xs text-subtle">{t('listing.orDrag')}</span>
        {type === 'video' ? <span className="text-xs text-subtle">{t('listing.videoLimit', { seconds: VIDEO_MAX_SECONDS })}</span> : null}
      </button>
    );
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-muted">
        {kind === 'job'
          ? t('listing.coverPhoto')
          : video_
            ? t('listing.mediaCount', { photos: photos.length, limit, videos: video ? 1 : 0 })
            : t('listing.photoCount', { photos: photos.length, limit })}
        {needsPhoto(kind) ? null : <span className="text-subtle"> · {t('listing.optional')}</span>}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((name, i) => (
          <div key={name} className="group relative aspect-square overflow-hidden rounded-lg bg-raised">
            {/* eslint-disable-next-line @next/next/no-img-element -- the seller's own upload */}
            <img src={mediaUrl(name)} alt={t('listing.photoN', { n: i + 1 })} className="size-full object-cover" />
            {i === 0 && kind !== 'job' ? <span className="media-chip absolute bottom-1.5 left-1.5">{t('listing.cover')}</span> : null}
            <button
              type="button"
              onClick={() => onRemove(name)}
              aria-label={t('listing.removePhoto', { n: i + 1 })}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        ))}
        {video ? (
          <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
            <video src={mediaUrl(video)} muted playsInline className="size-full object-cover" />
            <Icon name="play" className="pointer-events-none absolute inset-0 m-auto size-8 fill-current text-white/90" />
            <button type="button" onClick={() => onRemove('video')} aria-label={t('listing.removeVideo')} className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
              <Icon name="close" className="size-4" />
            </button>
          </div>
        ) : null}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up${i}`} className="flex aspect-square animate-pulse items-center justify-center rounded-lg bg-raised text-xs text-subtle">
            {t('listing.uploading')}
          </div>
        ))}
        {tile('photo')}
        {video_ ? tile('video') : null}
      </div>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        multiple={limit > 1}
        hidden
        onChange={(e) => {
          onAdd([...(e.target.files ?? [])], 'photo');
          e.target.value = '';
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          onAdd([...(e.target.files ?? [])], 'video');
          e.target.value = '';
        }}
      />
    </div>
  );
}

// A place from the geocoder, never typed (as the default location is).
function PlacePicker({ value, onChange, invalid, label }: { value: ListingPlace | null; onChange: (place: ListingPlace | null) => void; invalid: boolean; label: string }) {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ q: string; places: ListingPlace[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const q = query.trim();
  const results = q.length >= 2 && found?.q === q ? found.places : [];

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/place/search?q=${encodeURIComponent(q)}&lang=${locale}`, { signal: controller.signal });
        setFound({ q, places: res.ok ? ((await res.json()) as ListingPlace[]) : [] });
      } catch {
        // Aborted by the next keystroke, or offline.
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, locale]);

  const pick = (place: ListingPlace) => {
    onChange(place);
    setQuery('');
    setEditing(false);
  };

  if (value && !editing) {
    return (
      <div className={`field flex items-center gap-3 py-2 ${invalid ? 'ring-2 ring-danger' : ''}`}>
        <Icon name="pin" className="size-5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-subtle">{label}</span>
          <span className="block truncate text-ink">{value.name ?? `${value.latitude.toFixed(2)}, ${value.longitude.toFixed(2)}`}</span>
        </span>
        <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">
          {t('listing.change')}
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input
        type="search"
        autoComplete="off"
        aria-label={label}
        placeholder={label}
        className={`field py-3 ${invalid ? 'ring-2 ring-danger' : ''}`}
        value={query}
        autoFocus={editing}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) {
            e.preventDefault();
            pick(results[0]);
          } else if (e.key === 'Escape' && editing) {
            e.stopPropagation();
            setEditing(false);
          }
        }}
      />
      {results.length ? (
        <ul className="floating absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto py-1">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude},${place.name}`}>
              <button type="button" onClick={() => pick(place)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-raised">
                <Icon name="pin" className="size-4 shrink-0 text-subtle" />
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
