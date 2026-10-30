'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/client/i18n';
import Anchor from '@/components/ui/Anchor';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/config';
import type { PinReview } from '@/lib/pinReviews';
import { PinReviewSentiment, type ReviewSentimentPoint } from './PinReviewSentiment';
import { hostOf } from './reviewHost';

// Reviews shown at first, and added each time "Show more" is pressed.
const PAGE = 5;

// The independent reviews under a radar (PinTaste.reviews, PinCarPerf.reviews):
// each a link titled by the page (its host when it has no title), the host and
// publication day beside it, and the short extract quoted beneath. Nothing
// when there are none. Under them, attached to the same card, the "Sentiment
// over time" graph of the reviews that are dated and scored: clicking a dot
// selects its review, loading more of the list if it is not shown yet and
// scrolling it into view. A long list shows five and a "Show more" button adds
// five at a time.
// `bare` drops the rule and gap above it, for a list that stands in a card of its own.
export function ReviewList({ reviews, heading, locale, bare = false }: { reviews: PinReview[]; heading: string; locale: string; bare?: boolean }) {
  const dates = new Intl.DateTimeFormat(INTL_LOCALES[locale as Locale] ?? 'en', { dateStyle: 'medium', timeZone: 'UTC' });
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<string | null>(null);
  const t = useT();
  const boxRef = useRef<HTMLUListElement>(null);

  const points = useMemo<ReviewSentimentPoint[]>(
    () =>
      reviews.flatMap((r) =>
        r.sentiment != null && r.publishedDate ? [{ at: Date.parse(r.publishedDate), value: r.sentiment, title: r.title || r.url, url: r.url, quote: r.quote }] : [],
      ),
    [reviews],
  );

  // The selected review in view, once it is on the page.
  useEffect(() => {
    if (!selected) return;
    const box = boxRef.current;
    const item = box && Array.from(box.querySelectorAll<HTMLElement>('[data-review]')).find((el) => el.dataset.review === selected);
    item?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected, shown]);

  if (!reviews.length) return null;

  const select = (url: string) => {
    setSelected(url);
    const index = reviews.findIndex((r) => r.url === url);
    if (index >= 0) setShown((n) => Math.max(n, index + 1));
  };
  const visible = reviews.slice(0, shown);

  return (
    <div className={bare ? '' : 'mt-2 border-t border-line pt-2'}>
      <h3 className="mb-1 text-xs font-semibold text-muted">{heading}</h3>
      <ul ref={boxRef} className="grid gap-1.5 text-xs">
        {visible.map((review) => (
          <li
            key={review.url}
            data-review={review.url}
            className={review.url === selected ? '-mx-1.5 rounded-md bg-accent/10 px-1.5 py-1 ring-1 ring-accent/40' : undefined}
            aria-current={review.url === selected || undefined}
          >
            <Anchor href={review.url} className="font-medium">
              {review.title || hostOf(review.url)}
            </Anchor>
            <span className="text-muted">
              {' · '}
              {hostOf(review.url)}
              {review.publishedDate ? ` · ${dates.format(new Date(review.publishedDate))}` : ''}
            </span>
            {review.quote ? <q className="mt-0.5 block text-muted">{review.quote}</q> : null}
          </li>
        ))}
      </ul>
      {shown < reviews.length ? (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-1.5 text-xs font-medium text-accent hover:underline">
          {t('common.showMore')}
        </button>
      ) : null}
      {points.length ? <PinReviewSentiment points={points} selected={selected} onSelect={select} embedded className="mt-2 border-t border-line pt-2" /> : null}
    </div>
  );
}
