'use client';

import { useCallback, useEffect, useState } from 'react';
import { Stars } from '@/components/listings/parts';
import { AuthLink } from '@/components/nav/AuthLink';
import { Icon } from '@/components/ui/Icon';
import { api, isEmailUnverified } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useSession } from '@/lib/client/session';
import { REVIEW_COMMENT_MAX, type PinReviewJson, type ReviewSummary } from '@/lib/userReviews';
import { StarInput } from './ReviewParts';

type Loaded = { summary: ReviewSummary; reviews: PinReviewJson[] };

// What readers think of the pin: an overall star rating with an optional
// comment, one per reader (rating again replaces it), and everyone's below.
export function PinReviews({ pinId }: { pinId: number }) {
  const t = useT();
  const { isLoggedIn } = useSession();
  const [data, setData] = useState<Loaded>({ summary: { average: null, count: 0 }, reviews: [] });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get<Loaded>(`/api/pins/${pinId}/reviews`)
      .then((loaded) => {
        setData(loaded);
        const mine = loaded.reviews.find((r) => r.mine);
        setStars(mine?.stars ?? 0);
        setComment(mine?.comment ?? '');
      })
      .catch(() => {});
  }, [pinId]);
  // Read again once the session is known, so the reader's own review is filled in.
  useEffect(load, [load, isLoggedIn]);

  const mine = data.reviews.find((r) => r.mine);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (!stars) return setError(t('reviews.pickStars'));
    setSending(true);
    setError('');
    try {
      await api.put(`/api/pins/${pinId}/reviews`, { stars, comment: comment.trim() || null });
      load();
    } catch (err) {
      setError(isEmailUnverified(err) ? t('verifyEmail.required') : t('reviews.failed'));
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    await api.delete(`/api/pins/${pinId}/reviews`).catch(() => {});
    setStars(0);
    setComment('');
    load();
  }

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="surface mt-6 scroll-mt-20 px-4 py-3">
      <h2 id="reviews-heading" className="flex items-center gap-2 text-base font-semibold">
        <Icon name="star" className="size-4 shrink-0 text-accent" />
        {t('reviews.heading')}
      </h2>
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
              onChange={(e) => setComment(e.target.value)}
              maxLength={REVIEW_COMMENT_MAX}
              rows={3}
              placeholder={t('reviews.commentPlaceholder')}
              className="mt-1 block w-full rounded-md border border-line bg-popover px-2 py-1.5 text-sm text-ink"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
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
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
