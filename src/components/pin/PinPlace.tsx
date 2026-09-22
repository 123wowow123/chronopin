'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { busyLabel, busyPercent, loadPlace, ratingOutOf, waitLabel, type PinPlaceJson, type PlaceScoreJson } from '@/lib/places';
import { ratingScore } from '@/lib/format';
import type { PinRatingJson } from '@/lib/types';

// What the place is like right now: its Google and Yelp star ratings, each
// linking to that source's own page for it, how busy it is, and a way to book
// a table. The reviews are not reproduced here - the rating and the link are
// what the panel carries, and the sources' own pages hold the rest.
//
// Everything in here arrives from /api/pins/:id/place after the page loads,
// because none of it may be stored (see src/server/places.ts) - so the panel
// is absent until it answers, and stays absent when nothing does. A pin only
// renders this at all when it has a place resolved, so the request is not
// made on pins that could never answer.
export function PinPlace({ pinId, ratings }: { pinId: number; ratings?: PinRatingJson[] }) {
  const [place, setPlace] = useState<PinPlaceJson | null>(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    loadPlace(pinId).then((p) => {
      if (!cancelled) setPlace(p);
    });
    return () => {
      cancelled = true;
    };
  }, [pinId]);

  const stored = ratings ?? [];
  // The stored ratings (a MICHELIN star count, 0017) are server-rendered data
  // and belong in the same block as the live ones - they are all "what this
  // place scores". So the panel renders as soon as either exists, and a place
  // lookup that answers with nothing cannot take the MICHELIN chip off the
  // page with it.
  if (!place && !stored.length) return null;

  const busy = busyLabel(place?.busy, t);
  const wait = waitLabel(place?.busy, t);
  const percent = busyPercent(place?.busy);
  const open = place?.hours?.openNow;

  return (
    <section aria-labelledby="place-heading" className="surface mb-4 flex flex-col gap-3 px-4 py-3">
      <h2 id="place-heading" className="sr-only">
        {t('place.heading')}
      </h2>

      {/* Scores, open/closed and the booking link on one wrapping row. */}
      <div className="flex flex-wrap items-center gap-2">
        <Ratings stored={stored} scores={place?.scores ?? []} />

        {open != null ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              open ? 'bg-success/10 text-success' : 'bg-subtle/10 text-muted'
            }`}
          >
            <Icon name="clock" className="size-3.5" />
            {open ? t('place.openNow') : t('place.closed')}
            {open && place?.hours?.closing ? <span className="font-normal text-muted">{place!.hours!.closing}</span> : null}
          </span>
        ) : null}

        {place?.reservation ? (
          <a
            href={place.reservation.url}
            target="_blank"
            rel="noopener nofollow"
            // Flows with the row rather than being pushed right: once the
            // ratings block holds three sources the row wraps, and ml-auto
            // left the button stranded alone on the second line.
            className="btn btn-sm btn-primary"
          >
            {place.reservation.provider
              ? t('place.bookOn', { provider: place.reservation.provider })
              : t('place.book')}
            <Icon name="external" className="size-3 shrink-0 opacity-80" />
          </a>
        ) : null}
      </div>

      {/* How busy it is. Google prints this for some places and not others,
          so the bar is absent far more often than it is here. */}
      {busy || wait || percent != null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Icon name="users" className="size-4 text-muted" />
          {busy ? <span className="font-semibold text-ink">{busy}</span> : null}
          {percent != null ? (
            <span
              className="h-1.5 w-24 overflow-hidden rounded-full bg-line"
              role="img"
              aria-label={t('place.busy.aria', { percent })}
            >
              <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
            </span>
          ) : null}
          {wait ? <span className="text-muted">{wait}</span> : null}
        </div>
      ) : null}
    </section>
  );
}

// Every source's rating in ONE block, with a single star: two pills side by
// side read as two unrelated badges, when they are the same fact measured
// twice. Each source inside still links to its own page for the place.
function Ratings({ stored, scores }: { stored: PinRatingJson[]; scores: PlaceScoreJson[] }) {
  // Every rating this place has, in the order they settle: a guide's verdict
  // (which does not move) before the crowd's running average.
  const all = [
    ...stored.map((r) => ({
      key: `stored-${r.source}`,
      source: r.source,
      value: ratingScore(r.score, r.scoreMax, r.source),
      count: null as number | null,
      url: r.url ?? null,
      label: `${r.source}: ${ratingScore(r.score, r.scoreMax, r.source)}`,
    })),
    ...scores.map((s) => ({
      key: `place-${s.source}`,
      source: s.source,
      value: ratingOutOf(s),
      count: s.count,
      url: s.url,
      label: null as string | null,
    })),
  ];
  if (!all.length) {
    return null;
  }
  return (
    // Three sources wrap onto two lines in the pin page's column whatever the
    // viewport does - a breakpoint cannot see a column's width - so the block
    // is built to wrap well rather than to avoid it: rounded-2xl, because a
    // pill around two lines looks like a mistake, and **no dividers**. A
    // vertical rule between entries ended up leading the wrapped line, which
    // read as a stray mark; the bold value against the muted source separates
    // them well enough on its own.
    <div className="surface flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-1.5 text-sm">
      <Icon name="star" className="size-4 shrink-0 text-amber-500" />
      {all.map((one) => (
        <Source key={one.key} one={one} />
      ))}
    </div>
  );
}

type OneRating = {
  source: string;
  value: string;
  count: number | null;
  url: string | null;
  label: string | null;
};

function Source({ one }: { one: OneRating }) {
  const t = useT();
  const label = one.label ?? t('place.ratingLabel', { source: one.source, rating: one.value, max: 5 });
  const content = (
    <>
      <span className="font-semibold text-ink tabular-nums">{one.value}</span>
      <span className="text-muted">{one.source}</span>
      {one.count != null ? (
        // Dropped on a phone, where the rating and the source are all there is
        // room for. nowrap so it can never break mid-phrase where it shows.
        <span className="hidden text-xs whitespace-nowrap text-subtle tabular-nums sm:inline">
          {t('place.reviewCount', { count: one.count })}
        </span>
      ) : null}
    </>
  );
  const className = 'flex items-center gap-1.5';
  return one.url ? (
    <a href={one.url} target="_blank" rel="noopener nofollow" className={`${className} hover:underline`} title={label}>
      {content}
      <Icon name="external" className="size-3 shrink-0 opacity-70" />
    </a>
  ) : (
    <span className={className} title={label}>
      {content}
    </span>
  );
}
