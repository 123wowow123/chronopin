'use client';

import Anchor from '@/components/ui/Anchor';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { isStoreWordmark, StoreLogo } from '@/components/pin/StoreLogo';
import { useT } from '@/lib/client/i18n';
import { money } from '@/lib/format';
import { availableIn, withMatches, type ShopLink, type ShopMatch } from '@/lib/shopping';

// The "Buy on" row: the pin's stored listings, then a search of each store it
// has none on (src/lib/shopping.ts), in the store's colours. A store whose
// exact listing is found live (/api/pins/:id/shop, eBay) swaps its search for
// that listing and its price once the answer comes. Each click is reported
// (/api/pins/:id/shop-click).
export function ShopButtons({ pinId, links, productName }: { pinId: number; links: ShopLink[]; productName?: string | null }) {
  const t = useT();
  const [matches, setMatches] = useState<ShopMatch[]>([]);
  const [country, setCountry] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);
  const lookup = links.some((link) => link.search && link.store === 'eBay');

  useEffect(() => {
    if (!lookup) return;
    let cancelled = false;
    fetch(`/api/pins/${pinId}/shop`)
      .then((res) => (res.status === 200 ? (res.json() as Promise<{ matches: ShopMatch[] }>) : null))
      .then((body) => {
        if (!cancelled && body?.matches?.length) setMatches(body.matches);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pinId, lookup]);

  // Pin pages are cached, so where the viewer is comes after load.
  useEffect(() => {
    let cancelled = false;
    // Dev preview: ?country=GB shows the row as a viewer there sees it.
    const preview = process.env.NODE_ENV !== 'production' ? new URLSearchParams(window.location.search).get('country') : null;
    if (preview && /^[a-z]{2}$/i.test(preview)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after mount (keeps SSR and hydration identical)
      setCountry(preview.toUpperCase());
      return;
    }
    fetch('/api/viewer-country')
      .then((res) => (res.ok ? (res.json() as Promise<{ country: string | null }>) : null))
      .then((body) => {
        if (!cancelled && body?.country) setCountry(body.country);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Counted for the admin Clicks page as the store opens: a beacon survives
  // the tab switching away, and nothing waits for it.
  const report = (link: ShopLink) => {
    const body = JSON.stringify({
      store: link.store,
      url: link.url,
      search: link.search,
      price: link.price,
      currency: link.currency,
    });
    try {
      navigator.sendBeacon(`/api/pins/${pinId}/shop-click`, new Blob([body], { type: 'application/json' }));
    } catch {}
  };

  const all = withMatches(links, matches, productName ?? '');
  const usable = all.filter((link) => availableIn(link, country));
  // A pin with its own listing (a ticket page, the maker's shop) keeps that
  // up front; the generic store searches (Amazon, eBay, ...) go behind the …
  const hasListing = usable.some((link) => !link.search);
  const here = hasListing ? usable.filter((link) => !link.search) : usable;
  const lessRelevant = hasListing ? usable.filter((link) => link.search) : [];
  const elsewhere = all.filter((link) => !availableIn(link, country));
  const countryName = (code: string) => {
    try {
      return new Intl.DisplayNames([t.locale], { type: 'region' }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  // Links the viewer's country cannot use, grouped by the country they serve.
  const groups = new Map<string, ShopLink[]>();
  for (const link of elsewhere) {
    const key = (link.countries ?? []).map(countryName).join(', ');
    groups.set(key, [...(groups.get(key) ?? []), link]);
  }
  const moreLabel = t('pin.moreStores');
  const sections: [string, ShopLink[]][] = [...(lessRelevant.length ? ([[moreLabel, lessRelevant]] as [string, ShopLink[]][]) : []), ...groups];

  const button = (link: ShopLink) => (
    <Anchor
      key={link.store + link.url}
      href={link.url}
      target="_blank"
      rel="noopener nofollow sponsored"
      onClick={() => report(link)}
      onAuxClick={(event) => event.button === 1 && report(link)}
      title={
        link.search
          ? t('pin.searchStore', {
              store: link.store,
              product: productName ?? '',
            })
          : t('pin.buyOn', { store: link.store })
      }
      className={`btn h-8 gap-1.5 px-3 py-0 shadow-sm transition hover:-translate-y-px hover:shadow-md ${link.background ? 'border border-white/15 hover:brightness-110' : 'btn-buy'}`}
      style={
        link.background
          ? {
              backgroundColor: link.background,
              color: link.text,
              borderColor: link.border,
            }
          : undefined
      }
    >
      {/* The store's own mark; a store we have no colours for gets
              the plain search or cart icon instead. */}
      {link.background ? (
        <StoreLogo store={link.store} className={isStoreWordmark(link.store) ? 'h-5 w-auto shrink-0' : 'size-4 shrink-0'} />
      ) : (
        <Icon name={link.search ? 'search' : 'cart'} className="size-4" />
      )}
      {isStoreWordmark(link.store) ? <span className="sr-only">{link.store}</span> : link.store}
      {link.price ? (
        <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-xs">{money(link.price, link.currency)}</span>
      ) : link.price === 0 && link.store === 'Steam' ? (
        <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-xs">{t('listing.free')}</span>
      ) : null}
      <Icon name="external" className="size-3 shrink-0 opacity-60" />
    </Anchor>
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.buyOnHeading')}</span>
      {here.map(button)}
      {sections.length ? (
        <button
          type="button"
          onClick={() => setShowOther((v) => !v)}
          aria-expanded={showOther}
          aria-label={lessRelevant.length ? moreLabel : t('pin.otherCountries')}
          title={lessRelevant.length ? moreLabel : t('pin.otherCountries')}
          className="btn btn-secondary h-8 px-3 py-0"
        >
          …
        </button>
      ) : null}
      {showOther
        ? sections.map(([name, group]) => (
            <div key={name} className="flex basis-full flex-wrap items-center gap-2">
              <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{name}</span>
              {group.map(button)}
            </div>
          ))
        : null}
    </div>
  );
}
