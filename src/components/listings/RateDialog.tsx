'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { RATING_BODY_MAX, RATING_TAGS, type RatingInput, type RatingRole } from '@/lib/listings';
import { Dialog } from './parts';

const STAR_WORDS = ['veryPoor', 'poor', 'fair', 'good', 'excellent'] as const;

// "Rate seller" / "Rate buyer", as Marketplace asks it: stars, then what went
// well (four or five) or what could be better (three or fewer), and a few
// words. Opened from a chat about a listing once it has run seven turns.
export function RateDialog({
  listingId,
  user,
  role,
  initial,
  onClose,
  onRated,
}: {
  listingId: number;
  user: { id: number; userName: string };
  // The side the rated person was on.
  role: RatingRole;
  initial: RatingInput | null;
  onClose: () => void;
  onRated: (rating: RatingInput & { role: RatingRole }) => void;
}) {
  const t = useT();
  const [stars, setStars] = useState(initial?.stars ?? 0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [body, setBody] = useState(initial?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lit = hover || stars;
  const title = t(role === 'seller' ? 'listing.rateSeller' : 'listing.rateBuyer');

  async function submit() {
    setSaving(true);
    setError('');
    try {
      const { rating } = await api.post<{ rating: RatingInput & { role: RatingRole } }>(`/api/listings/${listingId}/ratings`, { userId: user.id, stars, tags, body });
      onRated(rating);
    } catch {
      setError(t('dm.actionFailed'));
      setSaving(false);
    }
  }

  return (
    <Dialog label={title} onClose={onClose} className="w-full max-w-lg">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4 pb-5">
        <p className="text-center text-lg font-semibold text-ink">{t(role === 'seller' ? 'listing.rateSellerQuestion' : 'listing.rateBuyerQuestion', { name: user.userName })}</p>
        <p className="text-center text-sm text-subtle">{t('listing.ratingsPublic')}</p>
        <div className="mt-4 flex justify-center gap-1" role="radiogroup" aria-label={title} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={t(`listing.stars.${STAR_WORDS[n - 1]}`)}
              onMouseEnter={() => setHover(n)}
              onClick={() => {
                // What went well and what could be better are different lists.
                if (n >= 4 !== stars >= 4) setTags([]);
                setStars(n);
              }}
              className="text-accent"
            >
              <Icon name="star" className={`size-10 ${n <= lit ? 'fill-current' : ''}`} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-center text-muted">{lit ? t(`listing.stars.${STAR_WORDS[lit - 1]}`) : ''}</p>
        {stars ? (
          <>
            <p className="mt-4 text-center text-lg font-semibold text-ink">{t(stars >= 4 ? 'listing.wentWell' : 'listing.couldImprove')}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {RATING_TAGS[role].map((tag) => {
                const on = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTags(on ? tags.filter((x) => x !== tag) : [...tags, tag])}
                    className={`rounded-full px-4 py-2 font-semibold transition-colors ${on ? 'bg-accent text-white' : 'bg-raised-2 text-ink hover:bg-raised'}`}
                  >
                    {t.dynamic(`listing.ratingTags.${tag}`, tag)}
                  </button>
                );
              })}
            </div>
            <textarea
              aria-label={t('listing.ratingBody')}
              placeholder={t('listing.ratingBody')}
              rows={4}
              maxLength={RATING_BODY_MAX}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="field mt-5 resize-none"
            />
            <p className="mt-1 text-xs text-subtle tabular-nums">
              {body.length} / {RATING_BODY_MAX}
            </p>
          </>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button type="button" onClick={() => void submit()} disabled={!stars || saving} className="btn btn-primary mt-5 w-full py-2.5">
          {t('listing.submit')}
        </button>
      </div>
    </Dialog>
  );
}
