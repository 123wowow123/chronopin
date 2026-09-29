'use client';

import { useT } from '@/lib/client/i18n';
import { averageRating, ratingPercent, ratingScore, reviewRatings } from '@/lib/format';
import type { PinRatingJson } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { RefineLink } from './RefineLink';

// A rating pill that, with `search`, searches for the pins rated at least
// what it shows (rating:>=81). Left a plain pill where it already sits inside
// a link, as a thread row does.
function RatingPill({
  ratings,
  search,
  className,
  title,
  children,
}: {
  ratings?: PinRatingJson[];
  search: boolean;
  className: string;
  title: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const percent = ratingPercent(ratings);
  if (!search || percent == null) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }
  return (
    <RefineLink
      field="rating"
      value={`>=${percent}`}
      // A small pill in a tight row, so the tap target grows past it
      // (ConfidenceBadge does the same).
      className={`relative ${className} after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] hover:no-underline hover:ring-amber-500/60`}
      title={`${title}\n${t('ratings.searchFrom', { percent })}`}
    >
      {children}
    </RefineLink>
  );
}

// The headline number over a pin's ratings, in two sizes: the large pill that
// leads the pin page's list, and a compact one for a timeline card. Nothing
// renders below two sources (see averageRating).
export function RatingAverage({
  ratings,
  compact = false,
  search = false,
  className = '',
}: {
  ratings?: PinRatingJson[];
  compact?: boolean;
  search?: boolean;
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
      <RatingPill
        ratings={ratings}
        search={search}
        className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-amber-500/30 ring-inset tabular-nums ${className}`}
        title={label}
      >
        <Icon name="star" className="size-3 text-amber-500" />
        {average}%
      </RatingPill>
    );
  }
  const pill = `flex items-center gap-2 rounded-full bg-amber-500/10 py-1.5 pr-4 pl-3 ring-1 ring-amber-500/30 ring-inset ${className}`;
  const content = (
    <>
      <Icon name="star" className="size-5 text-amber-500" />
      <span className="text-xl leading-none font-bold text-ink tabular-nums">{average}%</span>
      <span className="text-[11px] leading-tight text-muted">
        {t('ratings.average')}
        <br />
        {t('ratings.sources', { count })}
      </span>
    </>
  );
  if (search) {
    return (
      <RatingPill ratings={ratings} search className={`${pill} text-ink`} title={label}>
        {content}
      </RatingPill>
    );
  }
  return (
    <span className={pill} aria-label={label}>
      {content}
    </span>
  );
}

// One chip for a pin listed without its sources beside it (a thread row): the
// average where averageRating gives one, else the single source's own score,
// named so it never reads as a consensus of one.
export function RatingSummary({ ratings, search = false, className = '' }: { ratings?: PinRatingJson[]; search?: boolean; className?: string }) {
  const t = useT();
  const sources = reviewRatings(ratings);
  if (averageRating(ratings) != null || sources.length !== 1) {
    return <RatingAverage ratings={ratings} compact search={search} className={className} />;
  }
  const [only] = sources;
  const score = ratingScore(only.score, only.scoreMax, only.source);
  return (
    <RatingPill
      ratings={ratings}
      search={search}
      className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-amber-500/30 ring-inset tabular-nums ${className}`}
      title={t('ratings.soleLabel', { source: only.source, score })}
    >
      <Icon name="star" className="size-3 text-amber-500" />
      {score}
    </RatingPill>
  );
}

// Third-party scores (IMDb, Rotten Tomatoes, MyAnimeList, ...), each linking
// out to that source's own page when known, led by their average. Read-only:
// these come from scraping, not the edit form (see PinRating's schema
// comment).
export function PinRatings({ ratings, search = false, className = '-mt-1 mb-4' }: { ratings?: PinRatingJson[]; search?: boolean; className?: string }) {
  const t = useT();
  if (!ratings?.length) {
    return null;
  }
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`} aria-label={t('ratings.heading')}>
      {averageRating(ratings) != null ? (
        <li>
          <RatingAverage ratings={ratings} search={search} />
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
