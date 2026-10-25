import Anchor from '@/components/ui/Anchor';
import { INTL_LOCALES, type Locale } from '@/lib/i18n/config';
import type { PinReview } from '@/lib/pinReviews';

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// The independent reviews under a radar (PinTaste.reviews, PinCarPerf.reviews):
// each a link titled by the page (its host when it has no title), the host and
// publication day beside it, and the short extract quoted beneath. Nothing
// when there are none.
// `bare` drops the rule and gap above it, for a list that stands in a card of its own.
export function ReviewList({ reviews, heading, locale, bare = false }: { reviews: PinReview[]; heading: string; locale: string; bare?: boolean }) {
  if (!reviews.length) return null;
  const dates = new Intl.DateTimeFormat(INTL_LOCALES[locale as Locale] ?? 'en', { dateStyle: 'medium', timeZone: 'UTC' });
  return (
    <div className={bare ? '' : 'mt-2 border-t border-line pt-2'}>
      <h3 className="mb-1 text-xs font-semibold text-muted">{heading}</h3>
      <ul className="grid gap-1.5 text-xs">
        {reviews.map((review) => (
          <li key={review.url}>
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
    </div>
  );
}
