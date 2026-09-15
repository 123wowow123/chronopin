import { ratingScore } from '@/lib/format';
import type { PinRatingJson } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';

// Third-party scores (IMDb, Rotten Tomatoes, MyAnimeList, ...), each linking
// out to that source's own page when known. Read-only: these come from
// scraping, not the edit form (see PinRating's schema comment).
export function PinRatings({ ratings, className = '-mt-1 mb-4' }: { ratings?: PinRatingJson[]; className?: string }) {
  if (!ratings?.length) {
    return null;
  }
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Ratings">
      {ratings.map((rating, index) => {
        const content = (
          <>
            <Icon name="star" className="size-3.5 text-amber-500" />
            <span className="text-muted">{rating.source}</span>
            <span className="font-semibold text-ink tabular-nums">{ratingScore(rating.score, rating.scoreMax, rating.source)}</span>
          </>
        );
        const className = 'surface flex items-center gap-1.5 rounded-full px-3 py-1 text-xs';
        return (
          <li key={rating.id ?? index}>
            {rating.url ? (
              <a href={rating.url} target="_blank" rel="noopener nofollow" className={`${className} hover:ring-1 hover:ring-inset hover:ring-line`}>
                {content}
              </a>
            ) : (
              <span className={className}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
