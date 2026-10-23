'use client';

import Link from '@/components/ui/Link';
import { Stars } from '@/components/listings/parts';
import { useReviewSummary } from '@/lib/client/reviewSummaries';
import { useT } from '@/lib/client/i18n';
import { isReviewable } from '@/lib/userReviews';
import { pinPath } from '@/lib/seo';
import type { CardPin } from '@/lib/types';

// Reader stars on a card in a category list (Restaurants, Travel, Activities,
// Products, Cars, Music): the average and count, or a "Rate" link to the pin's
// review pane while nobody has rated it.
export function UserRatingBadge({ pin }: { pin: CardPin }) {
  const t = useT();
  const reviewable = isReviewable(pin.categories);
  const summary = useReviewSummary(pin.id, reviewable);
  if (!reviewable || !summary) return null;
  const href = `${pinPath(pin)}#reviews`;
  if (summary.average == null) {
    return (
      <Link href={href} className="ms-2 text-xs text-link hover:underline">
        ☆ {t('reviews.cardRate')}
      </Link>
    );
  }
  return (
    <Link href={href} title={t('reviews.cardTitle', { average: summary.average.toFixed(1), count: summary.count })} className="ms-2 inline-flex items-center gap-1 align-middle text-xs text-muted hover:no-underline">
      <Stars value={summary.average} className="size-3" />
      <span className="tabular-nums">{summary.average.toFixed(1)}</span>
      <span className="text-subtle tabular-nums">({summary.count})</span>
    </Link>
  );
}
