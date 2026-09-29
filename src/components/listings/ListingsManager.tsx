'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useNow } from '@/lib/client/now';
import { timeAgo } from '@/lib/format';
import { LISTING_STATUSES, listingHref, RATING_TURNS, type ListingJson, type ListingStatus, type RatingInput, type RatingRole } from '@/lib/listings';
import { pinPath } from '@/lib/seo';
import { ListingForm } from './ListingForm';
import { ListingCover, listingTitle, priceLine, RatingBadge, Stars } from './parts';

type Received = RatingInput & {
  id: number;
  role: RatingRole;
  listingId: number;
  listingTitle: string;
  rater: { id: number; userName: string; pictureUrl: string | null };
  utcCreatedDateTime: string;
};

type Filter = 'all' | ListingStatus;

const STATUS_CHIP: Record<ListingStatus, string> = {
  available: 'bg-success/15 text-success',
  pending: 'bg-warning/15 text-warning',
  sold: 'bg-raised-2 text-muted',
};

const summary = (ratings: Received[], role: RatingRole) => {
  const mine = ratings.filter((r) => r.role === role);
  return { count: mine.length, average: mine.length ? Math.round((mine.reduce((sum, r) => sum + r.stars, 0) / mine.length) * 10) / 10 : null };
};

// The /listings page: every listing the reader has up, by status, each with
// its status, Edit and Delete; then the ratings they have been given.
export function ListingsManager() {
  const t = useT();
  const [data, setData] = useState<{ listings: ListingJson[]; ratings: Received[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<ListingJson | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const now = useNow(60_000);

  useEffect(() => {
    api
      .get<{ listings: ListingJson[]; ratings: Received[] }>('/api/listings')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const replace = (listing: ListingJson) =>
    setData((d) => (d ? { ...d, listings: [listing, ...d.listings.filter((l) => l.id !== listing.id)].sort((a, b) => b.utcUpdatedDateTime.localeCompare(a.utcUpdatedDateTime)) } : d));

  async function setStatus(listing: ListingJson, status: ListingStatus) {
    setError('');
    try {
      const saved = await api.patch<{ listing: ListingJson }>(`/api/listings/${listing.id}`, { status });
      replace({ ...listing, ...saved.listing, pinTitle: listing.pinTitle, chats: listing.chats });
    } catch {
      setError(t('dm.actionFailed'));
    }
  }

  async function remove(id: number) {
    setError('');
    try {
      await api.delete(`/api/listings/${id}`);
      setData((d) => (d ? { ...d, listings: d.listings.filter((l) => l.id !== id) } : d));
    } catch {
      setError(t('dm.actionFailed'));
    } finally {
      setDeleting(null);
    }
  }

  if (failed) return <p className="text-sm text-danger">{t('common.somethingWrong')}</p>;
  if (!data) return <p className="text-sm text-subtle">{t('common.loading')}</p>;

  const counts = Object.fromEntries(LISTING_STATUSES.map((s) => [s, data.listings.filter((l) => l.status === s).length])) as Record<ListingStatus, number>;
  const shown = filter === 'all' ? data.listings : data.listings.filter((l) => l.status === filter);

  return (
    <div className="space-y-8">
      <section aria-labelledby="listings-heading">
        <h2 id="listings-heading" className="sr-only">
          {t('listing.yourListings')}
        </h2>
        <div className="mb-4 flex flex-wrap gap-2" role="tablist">
          {(['all', ...LISTING_STATUSES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === f ? 'bg-accent/15 text-accent' : 'bg-raised text-muted hover:bg-raised-2 hover:text-ink'}`}
            >
              {f === 'all' ? t('listing.all') : t(`listing.status.${f}`)}{' '}
              <span className="tabular-nums opacity-70">{f === 'all' ? data.listings.length : counts[f]}</span>
            </button>
          ))}
        </div>
        {error ? (
          <p role="alert" className="mb-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {!shown.length ? (
          <div className="surface p-6 text-center text-sm text-subtle">{data.listings.length ? t('listing.noneWithStatus') : t('listing.none')}</div>
        ) : (
          <ul className="space-y-3">
            {shown.map((listing) => {
              const href = listing.pinId ? `${pinPath({ id: listing.pinId, title: listing.pinTitle ?? '' })}?listing=${listing.id}` : listingHref(listing);
              return (
                <li key={listing.id} className="surface flex gap-3 p-3">
                  <Link href={href} className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-raised">
                    <ListingCover photo={listing.photos[0]} video={listing.video} className={listing.status === 'sold' ? 'opacity-50' : ''} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link href={href} className="truncate font-semibold text-ink">
                        {listingTitle(t, listing)}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[listing.status]}`}>{t(`listing.status.${listing.status}`)}</span>
                    </div>
                    <p className="text-sm text-ink">{priceLine(t, listing)}</p>
                    <p className="truncate text-xs text-subtle">
                      {t(`listing.kinds.${listing.kind}`)}
                      {listing.pinTitle ? ` · ${t('listing.onPin', { title: listing.pinTitle })}` : ''}
                    </p>
                    <p className="text-xs text-subtle">
                      {t('listing.listedAgo', { ago: timeAgo(listing.utcCreatedDateTime, now, t.locale) })} · {t('listing.chats', { count: listing.chats ?? 0 })}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        aria-label={t('listing.statusLabel')}
                        value={listing.status}
                        onChange={(e) => void setStatus(listing, e.target.value as ListingStatus)}
                        className="field w-auto py-1 text-sm"
                      >
                        {LISTING_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`listing.markAs.${s}`)}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setEditing(listing)} className="btn btn-secondary btn-sm">
                        <Icon name="pencil" className="size-3.5" />
                        {t('listing.edit')}
                      </button>
                      {deleting === listing.id ? (
                        <span className="flex items-center gap-1 text-sm">
                          <span className="text-muted">{t('listing.deleteConfirm')}</span>
                          <button type="button" onClick={() => void remove(listing.id)} className="btn btn-ghost btn-sm text-danger hover:text-danger">
                            {t('listing.delete')}
                          </button>
                          <button type="button" onClick={() => setDeleting(null)} className="btn btn-ghost btn-sm">
                            {t('common.cancel')}
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setDeleting(listing.id)} className="btn btn-ghost btn-sm text-danger hover:text-danger">
                          {t('listing.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="ratings-heading" className="space-y-3">
        <h2 id="ratings-heading" className="text-lg font-semibold text-ink">
          {t('listing.yourRatings')}
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="flex items-center gap-2 text-muted">
            {t('listing.asSeller')} <RatingBadge rating={summary(data.ratings, 'seller')} />
          </span>
          <span className="flex items-center gap-2 text-muted">
            {t('listing.asBuyer')} <RatingBadge rating={summary(data.ratings, 'buyer')} />
          </span>
        </div>
        {data.ratings.length ? (
          <ul className="space-y-2">
            {data.ratings.map((r) => (
              <li key={r.id} className="surface p-3">
                <div className="flex items-center gap-2">
                  <UserAvatar userName={r.rater.userName} pictureUrl={r.rater.pictureUrl} className="size-8 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{r.rater.userName}</span>
                    <span className="block truncate text-xs text-subtle">
                      {t(r.role === 'seller' ? 'listing.ratedAsSeller' : 'listing.ratedAsBuyer', { title: r.listingTitle })} · {timeAgo(r.utcCreatedDateTime, now, t.locale)}
                    </span>
                  </span>
                  <Stars value={r.stars} />
                </div>
                {r.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-raised-2 px-2.5 py-0.5 text-xs font-medium text-ink">
                        {t.dynamic(`listing.ratingTags.${tag}`, tag)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {r.body ? <p className="mt-2 text-sm whitespace-pre-wrap text-ink">{r.body}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">{t('listing.noRatingsYet', { turns: RATING_TURNS })}</p>
        )}
      </section>

      {editing ? (
        <ListingForm
          pinId={editing.pinId}
          kind={editing.kind}
          listing={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            replace({ ...saved, pinTitle: editing.pinTitle, chats: editing.chats });
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
