'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Stars } from '@/components/listings/parts';
import { AuthLink } from '@/components/nav/AuthLink';
import { Icon } from '@/components/ui/Icon';
import { setMenuItemReviewSummary } from '@/lib/client/menuItemReviewSummaries';
import { api, ApiError, isEmailUnverified } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';
import { blobUrl } from '@/lib/appConfig';
import { PinMediaFrame } from './PinMedia';
import { REVIEW_PHOTO_MAX, REVIEW_PHOTO_MAX_BYTES, REVIEW_COMMENT_MAX, type PinReviewJson, type ReviewSummary } from '@/lib/userReviews';
import { StarInput } from './ReviewParts';

type Loaded = { summary: ReviewSummary; reviews: PinReviewJson[] };

export function PinReviews({ pinId, menuItem }: { pinId: number; menuItem?: string }) {
  const t = useT();
  const headingId = useId();
  const endpoint = `/api/pins/${pinId}/reviews${menuItem ? `?item=${encodeURIComponent(menuItem)}` : ''}`;
  const { isLoggedIn } = useSession();
  const [data, setData] = useState<Loaded>({ summary: { average: null, count: 0 }, reviews: [] });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [removePhotoIds, setRemovePhotoIds] = useState<number[]>([]);
  const photoInput = useRef<HTMLInputElement>(null);
  const previewUrls = useRef<string[]>([]);
  const inputId = useId();
  function choose(next: File[]) {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current = next.map((file) => URL.createObjectURL(file));
    setPreviews(previewUrls.current);
    setFiles(next);
  }
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const load = useCallback(() => {
    api
      .get<Loaded>(endpoint)
      .then((loaded) => {
        setData(loaded);
        if (menuItem) setMenuItemReviewSummary(pinId, menuItem, loaded.summary);
        const mine = loaded.reviews.find((r) => r.mine);
        setStars(mine?.stars ?? 0);
        setComment(mine?.comment ?? '');
      })
      .catch(() => setError(t('reviews.failed')));
  }, [endpoint, t, menuItem, pinId]);
  // Read again once the session is known, so the reader's own review is filled in.
  useEffect(load, [load, isLoggedIn]);

  const mine = data.reviews.find((r) => r.mine);

  function pickPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!picked.length) return;
    if (picked.some((file) => !file.type.startsWith('image/'))) return setError(t('photos.notImage'));
    if (picked.some((file) => file.size > REVIEW_PHOTO_MAX_BYTES)) return setError(t('photos.tooLarge'));
    if (files.length + picked.length + (mine?.photos?.length ?? 0) - removePhotoIds.length > REVIEW_PHOTO_MAX) return setError(`Choose up to ${REVIEW_PHOTO_MAX} photos per review.`);
    setError('');
    choose([...files, ...picked]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (!stars) return setError(t('reviews.pickStars'));
    if (files.length + (mine?.photos?.length ?? 0) - removePhotoIds.length > REVIEW_PHOTO_MAX) return setError(`Choose up to ${REVIEW_PHOTO_MAX} photos per review.`);
    setSending(true);
    setError('');
    try {
      if (files.length) {
        const form = new FormData();
        form.set('stars', String(stars));
        form.set('comment', comment.trim());
        form.set('removePhotoIds', JSON.stringify(removePhotoIds));
        files.forEach((file) => form.append('photos', file));
        await api.put(endpoint, form);
      } else {
        await api.put(endpoint, { stars, comment: comment.trim() || null, removePhotoIds });
      }
      choose([]);
      setRemovePhotoIds([]);
      load();
    } catch (err) {
      setError(isEmailUnverified(err) ? t('verifyEmail.required') : err instanceof ApiError && err.status === 413 ? t('photos.tooLarge') : err instanceof ApiError && err.status === 400 ? err.message : err instanceof ApiError && err.status === 429 ? t('photos.tooMany') : t('reviews.failed'));
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      await api.delete(endpoint);
      choose([]);
      setRemovePhotoIds([]);
      load();
    } catch {
      setError(t('reviews.failed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <section id={menuItem ? undefined : "reviews"} aria-labelledby={headingId} className="surface mt-6 scroll-mt-20 px-4 py-3">
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
        <Icon name="star" className="size-4 shrink-0 text-accent" />
        {t('reviews.heading')}
      </h2>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {data.summary.average != null ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-muted">
          <Stars value={data.summary.average} className="size-4" />
          {t('reviews.summary', { average: data.summary.average.toFixed(1), count: data.summary.count })}
        </p>
      ) : (
        <p className="mt-1 text-sm text-subtle">{t('reviews.none')}</p>
      )}

      {isLoggedIn ? (
        <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg bg-raised p-3">
          <p className="text-xs font-medium text-subtle">{t('reviews.yourRating')}</p>
          <StarInput value={stars} onChange={setStars} label={t('reviews.yourRating')} disabled={sending} />
          <label className="block text-xs text-subtle">
            {t('reviews.comment')}
            <textarea
              value={comment}
              disabled={sending}
              onChange={(e) => setComment(e.target.value)}
              maxLength={REVIEW_COMMENT_MAX}
              rows={3}
              placeholder={t('reviews.commentPlaceholder')}
              className="mt-1 block w-full rounded-md border border-line bg-popover px-2 py-1.5 text-sm text-ink"
            />
          </label>
          {menuItem ? <div className="space-y-2 rounded-xl border border-dashed border-line p-3" lang="en">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-xs font-medium text-ink">Photos <span className="font-normal text-subtle">(optional)</span></p><p id={`${inputId}-hint`} className="mt-1 text-[11px] text-subtle">Up to {REVIEW_PHOTO_MAX} photos · 15 MB each</p></div>
              <button type="button" className="btn btn-ghost text-xs" disabled={sending || files.length + (mine?.photos?.length ?? 0) - removePhotoIds.length >= REVIEW_PHOTO_MAX} onClick={() => photoInput.current?.click()}><Icon name="image" className="size-4" />Add photos</button>
            </div>
            <input id={inputId} ref={photoInput} type="file" accept="image/*" multiple hidden disabled={sending} onChange={pickPhotos} aria-label={`Add photos of ${menuItem}`} aria-describedby={`${inputId}-hint`} />
            {previews.length || mine?.photos?.some((photo) => !removePhotoIds.includes(photo.id)) ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {mine?.photos?.filter((photo) => !removePhotoIds.includes(photo.id)).map((photo) => <div key={photo.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- a stored reader photo */}
                <img src={blobUrl(photo.blobName)} alt={`${menuItem} — your photo`} className="aspect-square w-full rounded-lg object-cover" />
                <button type="button" disabled={sending} onClick={() => setRemovePhotoIds((ids) => [...ids, photo.id])} aria-label="Remove attached photo" className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white"><Icon name="close" className="size-3" /></button>
              </div>)}
              {previews.map((url, index) => <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local upload preview */}
                <img src={url} alt={`${menuItem} — selected photo ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                <button type="button" disabled={sending} onClick={() => choose(files.filter((_, i) => i !== index))} aria-label={`Remove selected photo ${index + 1}`} className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white"><Icon name="close" className="size-3" /></button>
              </div>)}
            </div> : null}
          </div> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="btn btn-primary">
              {sending ? t('reviews.saving') : mine ? t('reviews.update') : t('reviews.post')}
            </button>
            {mine ? (
              <button type="button" disabled={sending} onClick={remove} className="btn btn-ghost">
                {t('reviews.remove')}
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-subtle">
          {t.rich('reviews.logIn', {
            login: (chunks) => (
              <AuthLink to="/login" className="font-medium">
                {chunks}
              </AuthLink>
            ),
          })}
        </p>
      )}

      {data.reviews.length ? (
        <ul className="mt-3 divide-y divide-line">
          {data.reviews.map((review) => (
            <li key={review.id} className="py-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-ink">{review.mine ? t('reviews.mine') : review.userName}</span>
                <Stars value={review.stars} />
                <time dateTime={review.utcUpdatedDateTime} className="text-xs text-subtle">
                  {new Date(review.utcUpdatedDateTime).toLocaleDateString(t.locale)}
                </time>
              </div>
              {review.comment ? <p className="mt-1 text-sm whitespace-pre-line text-ink">{review.comment}</p> : null}
              {review.photos?.length ? <div className="mt-3 max-w-md" aria-label={`Photos from ${review.userName}'s review`}>
                <PinMediaFrame className="overflow-hidden rounded-xl bg-[#141916] text-white [&_img]:max-h-64 [&_img]:object-contain" media={review.photos.map((photo) => ({ type: 1, originalUrl: blobUrl(photo.blobName), originalWidth: photo.width ?? undefined, originalHeight: photo.height ?? undefined }))} title={menuItem || review.userName} sizes="(max-width: 640px) 85vw, 400px" overlay={null} fallback={null} selectable />
                {review.photos.some((photo) => photo.hidden) ? <p className="mt-1 text-xs text-subtle">Your flagged photos are under review and only visible to you.</p> : null}
              </div> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
