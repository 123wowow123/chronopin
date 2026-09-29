'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/ui/Link';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { useT } from '@/lib/client/i18n';
import { useRouter } from '@/lib/client/navigation';
import { authHrefHere } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';
import type { ListingJson, ListingKind } from '@/lib/listings';
import { ListingForm } from './ListingForm';
import { ListingView } from './ListingView';
import { listingTitle, mediaUrl, priceLine } from './parts';

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
      </div>

      {listings.length ? (
        <div className="mt-3">
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-subtle uppercase">{t(`listing.listedHere.${kind}`, { count: listings.length })}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listings.map((listing) => (
              <li key={listing.id}>
                <button type="button" onClick={() => setViewing(listing)} className="group block w-full text-left">
                  <span className="relative block aspect-square overflow-hidden rounded-lg bg-raised ring-1 ring-line">
                    {listing.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- the seller's upload
                      <img src={mediaUrl(listing.photos[0])} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-[1.03]" />
                    ) : (
                      <Icon name="tag" className="absolute inset-0 m-auto size-10 text-subtle" />
                    )}
                    {listing.status === 'pending' ? <span className="media-chip absolute top-2 left-2">{t('listing.status.pending')}</span> : null}
                  </span>
                  <span className="mt-1.5 block font-semibold text-ink">{priceLine(t, listing)}</span>
                  <span className="block truncate text-sm text-ink">{listingTitle(t, listing)}</span>
                  <span className="block truncate text-xs text-subtle">{listing.location?.name ?? listing.seller.userName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {viewing ? <ListingView listing={viewing} onClose={() => setViewing(null)} onEdit={() => {
            setEditing(viewing);
            setViewing(null);
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
