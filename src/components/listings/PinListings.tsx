'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';
import type { ListingJson, ListingKind } from '@/lib/listings';
import { term } from '@/lib/searchTerms';
import { ListingForm } from './ListingForm';
import { ListingView } from './ListingView';
import { Dialog, ListingCover, listingTitle, priceLine } from './parts';

// Under the pin's Buy on row: "Sell this item here" (the form for the kind
// the pin sells as) and the readers' own listings of it. ?listing=<id> in
// the address opens one, as the seller's Listings page links it; ?sell=1
// opens the form, for a visitor who clicked the link and logged in first.
export function PinListings({ pinId, kind, productName, categories }: { pinId: number; kind: ListingKind; productName?: string | null; categories?: string[] }) {
  const t = useT();
  const router = useRouter();
  const { isLoggedIn, status } = useSession();
  const [listings, setListings] = useState<ListingJson[]>([]);
  const [viewing, setViewing] = useState<ListingJson | null>(null);
  const [editing, setEditing] = useState<ListingJson | 'new' | null>(null);
  const [published, setPublished] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ listings: ListingJson[] }>(`/api/pins/${pinId}/listings`)
      .then(({ listings }) => {
        if (cancelled) return;
        setListings(listings);
        const wanted = Number(new URLSearchParams(window.location.search).get('listing'));
        const found = wanted && listings.find((l) => l.id === wanted);
        if (found) setViewing(found);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pinId]);

  // Back from logging in: the form they asked for, open, and the mark taken
  // off the address so a reload does not open it again.
  useEffect(() => {
    if (status !== 'ready') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('sell')) return;
    url.searchParams.delete('sell');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if (!isLoggedIn) return;
    // After this render, not during it.
    queueMicrotask(() => setEditing('new'));
  }, [status, isLoggedIn]);

  function sell() {
    if (isLoggedIn) setEditing('new');
    else if (status === 'ready') router.push(authHrefHere('/login', { sell: '1' }));
  }

  function saved(listing: ListingJson) {
    setListings((list) => [listing, ...list.filter((l) => l.id !== listing.id)]);
    setPublished(editing === 'new');
    setEditing(null);
  }

  return (
    <section aria-label={t('listing.forSaleHere')} className="mt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" onClick={sell} className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
          <Icon name="tag" className="size-4" />
          {t(`listing.sellHere.${kind}`)}
        </button>
        {published ? (
          <span role="status" className="text-sm text-success">
            {t('listing.published')}{' '}
            <Link href="/listings" className="font-medium">
              {t('listing.manage')}
            </Link>
          </span>
        ) : null}
        {/* The map's Marketplace layer kept to this pin's listings, searched
            for as pin:<id> so the search box shows the filter (and takes it
            off). Always: with none placed yet the map says so, rather than
            quietly showing every listing. */}
        <Link
          href={`/map?show=market&q=${encodeURIComponent(term('pin', String(pinId)))}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-medium text-ink hover:bg-raised hover:no-underline"
        >
          <Icon name="map" className="size-4 text-link" />
          {t('listing.marketMap')}
        </Link>
      </div>

      {listings.length ? <ListingRow kind={kind} listings={listings} onView={setViewing} onViewAll={() => setShowAll(true)} /> : null}

      {/* Under a listing opened from it, the whole list waits to come back. */}
      {showAll && !viewing && !editing ? (
        <Dialog label={t(`listing.listedHere.${kind}`, { count: listings.length })} onClose={() => setShowAll(false)} className="w-full max-w-4xl">
          <ul className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} onView={setViewing} />
              </li>
            ))}
          </ul>
        </Dialog>
      ) : null}
      {viewing ? <ListingView listing={viewing} onClose={() => setViewing(null)} onEdit={() => {
            setEditing(viewing);
            setViewing(null);
            setShowAll(false);
          }} /> : null}
      {editing ? (
        <ListingForm
          pinId={pinId}
          kind={editing === 'new' ? kind : editing.kind}
          productName={productName}
          categories={categories}
          listing={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      ) : null}
    </section>
  );
}

// Two cards across a phone, three wider up, less the gap-3 between them. The
// arrows' boxes share it, so each sits centred on a photo's height.
const CARD_WIDTH = 'w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/3)]';

// One row of listings that pages sideways: an arrow at each end with more
// past it (a swipe does the same), and "View all" once they overflow.
function ListingRow({
  kind,
  listings,
  onView,
  onViewAll,
}: {
  kind: ListingKind;
  listings: ListingJson[];
  onView: (listing: ListingJson) => void;
  onViewAll: () => void;
}) {
  const t = useT();
  const row = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  useEffect(() => {
    const box = row.current;
    if (!box) return;
    // A pixel of slack: a zoomed page scrolls to fractions short of the end.
    const measure = () => setMore({ before: box.scrollLeft > 1, after: box.scrollLeft + box.clientWidth < box.scrollWidth - 1 });
    measure();
    box.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(box);
    return () => {
      box.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, [listings.length]);

  // A page at a time, to a card's edge: on, the first card cut off at the
  // right; back, the first a page's width behind.
  const step = (way: -1 | 1) => {
    const box = row.current;
    if (!box) return;
    const cards = [...box.children] as HTMLElement[];
    const lefts = cards.map((card) => card.offsetLeft - cards[0].offsetLeft);
    const end = box.scrollLeft + box.clientWidth;
    const left =
      way === 1
        ? (lefts.find((x, i) => x + cards[i].offsetWidth > end + 1) ?? box.scrollWidth)
        : (lefts.find((x) => x >= box.scrollLeft - box.clientWidth - 1) ?? 0);
    box.scrollTo({ left, behavior: 'smooth' });
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-wider text-subtle uppercase">{t(`listing.listedHere.${kind}`, { count: listings.length })}</h2>
        {more.before || more.after ? (
          <button type="button" onClick={onViewAll} className="text-sm font-semibold text-link hover:underline">
            {t('common.viewAll')}
          </button>
        ) : null}
      </div>
      <div className="relative">
        <ul ref={row} className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none]">
          {listings.map((listing) => (
            <li key={listing.id} className={`shrink-0 snap-start ${CARD_WIDTH}`}>
              <ListingCard listing={listing} onView={onView} />
            </li>
          ))}
        </ul>
        {more.before ? <RowArrow side="before" label={t('media.previous')} onStep={() => step(-1)} /> : null}
        {more.after ? <RowArrow side="after" label={t('media.next')} onStep={() => step(1)} /> : null}
      </div>
    </div>
  );
}

function RowArrow({ side, label, onStep }: { side: 'before' | 'after'; label: string; onStep: () => void }) {
  return (
    <div className={`pointer-events-none absolute top-0 flex aspect-square items-center ${CARD_WIDTH} ${side === 'before' ? 'left-0' : 'right-0 justify-end'}`}>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onStep}
        className={`pointer-events-auto flex size-10 items-center justify-center rounded-full bg-raised text-ink shadow-md ring-1 ring-line hover:bg-raised-2 active:scale-95 ${side === 'before' ? 'ml-2' : 'mr-2'}`}
      >
        <Icon name="chevron" className={`size-5 ${side === 'before' ? 'rotate-90' : '-rotate-90'}`} />
      </button>
    </div>
  );
}

function ListingCard({ listing, onView }: { listing: ListingJson; onView: (listing: ListingJson) => void }) {
  const t = useT();
  return (
    // Focus rings the photo: the row scrolls sideways, which clips anything
    // drawn outside a card down to a stray line in the gap.
    <button type="button" onClick={() => onView(listing)} className="group block w-full text-left focus-visible:outline-none">
      <span className="relative block aspect-square overflow-hidden rounded-lg bg-raised ring-1 ring-line group-focus-visible:ring-2 group-focus-visible:ring-link">
        <ListingCover photo={listing.photos[0]} video={listing.video} className="transition-transform group-hover:scale-[1.03]" iconClassName="size-10" />
        {listing.status === 'pending' ? <span className="media-chip absolute top-2 left-2">{t('listing.status.pending')}</span> : null}
      </span>
      <span className="mt-1.5 block font-semibold text-ink">{priceLine(t, listing)}</span>
      <span className="block truncate text-sm text-ink">{listingTitle(t, listing)}</span>
      {listing.location?.name ? <span className="block truncate text-xs text-subtle">{listing.location.name}</span> : null}
      {/* Who sells it and how buyers rated them: the stars and count, or a
          plain note before anyone has. */}
      <span className="mt-1 flex items-center gap-1.5 text-xs">
        <UserAvatar userName={listing.seller.userName} pictureUrl={listing.seller.pictureUrl} className="size-5 shrink-0 text-[9px]" />
        <span className="min-w-0 truncate text-muted">{listing.seller.userName}</span>
        {listing.sellerRating.count && listing.sellerRating.average != null ? (
          <span
            className="flex shrink-0 items-center gap-0.5 text-muted tabular-nums"
            title={t('listing.ratingTitle', { average: listing.sellerRating.average, count: listing.sellerRating.count })}
          >
            <Icon name="star" className="size-3.5 fill-current text-accent" />
            {listing.sellerRating.average.toFixed(1)}
            <span className="text-subtle">({listing.sellerRating.count})</span>
          </span>
        ) : (
          <span className="shrink-0 text-subtle">· {t('listing.noRatings')}</span>
        )}
      </span>
    </button>
  );
}
