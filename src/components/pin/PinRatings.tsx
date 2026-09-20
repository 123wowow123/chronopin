'use client';

import { useT } from '@/lib/client/i18n';
import { averageRating, ratingScore, reviewRatings } from '@/lib/format';
import type { PinRatingJson } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';

// The headline number over a pin's ratings, in two sizes: the large pill that
// leads the pin page's list, and a compact one for a timeline card. Nothing
// renders below two sources (see averageRating).
export function RatingAverage({
  ratings,
  compact = false,
  className = '',
}: {
  ratings?: PinRatingJson[];
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const average = averageRating(ratings);
  if (average == null) {
    return null;
  }
  const count = reviewRatings(ratings).length;
  const label = t('ratings.averageLabel', { count, average });
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-amber-500/30 ring-inset tabular-nums ${className}`}
        title={label}
      >
        <Icon name="star" className="size-3 text-amber-500" />
        {average}%
      </span>
    );
  }
  return (
    <span
      className={`flex items-center gap-2 rounded-full bg-amber-500/10 py-1.5 pr-4 pl-3 ring-1 ring-amber-500/30 ring-inset ${className}`}
      aria-label={label}
    >
      <Icon name="star" className="size-5 text-amber-500" />
      <span className="text-xl leading-none font-bold text-ink tabular-nums">{average}%</span>
      <span className="text-[11px] leading-tight text-muted">
        {t('ratings.average')}
        <br />
        {t('ratings.sources', { count })}
      </span>
    </span>
  );
}

// One chip for a pin listed without its sources beside it (a thread row): the
// average where averageRating gives one, else the single source's own score,
// named so it never reads as a consensus of one.
export function RatingSummary({ ratings, className = '' }: { ratings?: PinRatingJson[]; className?: string }) {
  const t = useT();
  const sources = reviewRatings(ratings);
  if (averageRating(ratings) != null || sources.length !== 1) {
    return <RatingAverage ratings={ratings} compact className={className} />;
  }
  const [only] = sources;
  const score = ratingScore(only.score, only.scoreMax, only.source);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-amber-500/30 ring-inset tabular-nums ${className}`}
      title={t('ratings.soleLabel', { source: only.source, score })}
    >
      <Icon name="star" className="size-3 text-amber-500" />
      {score}
    </span>
  );
}

// Third-party scores (IMDb, Rotten Tomatoes, MyAnimeList, ...), each linking
// out to that source's own page when known, led by their average. Read-only:
// these come from scraping, not the edit form (see PinRating's schema
// comment).
export function PinRatings({ ratings, className = '-mt-1 mb-4' }: { ratings?: PinRatingJson[]; className?: string }) {
  const t = useT();
  if (!ratings?.length) {
    return null;
  }
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`} aria-label={t('ratings.heading')}>
      {averageRating(ratings) != null ? (
        <li>
          <RatingAverage ratings={ratings} />
        </li>
      ) : null}
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
                <Icon name="external" className="size-3 shrink-0 opacity-70" />
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
