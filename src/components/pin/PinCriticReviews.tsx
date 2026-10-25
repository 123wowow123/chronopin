import type { Translator } from '@/lib/i18n/translate';
import type { PinCriticReviewsJson } from '@/lib/pinCriticReviews';
import { ReviewList } from './ReviewList';

// The independent critic reviews of a pin with no rubric of its own (a game, a
// film, an album: PinCriticReview, 0215), listed as under a radar: each a link
// to the page, its host and day, and the quoted extract. Their sentiment is on
// the pin's "Sentiment over time" graph.
export function PinCriticReviews({ reviews, t, locale, className = '' }: { reviews: PinCriticReviewsJson; t: Translator; locale: string; className?: string }) {
  return (
    <section className={`surface px-4 py-3 text-sm ${className}`} aria-label={t('pin.hotel.reviews')}>
      <ReviewList reviews={reviews.reviews} heading={t('pin.hotel.reviews')} locale={locale} bare />
    </section>
  );
}
