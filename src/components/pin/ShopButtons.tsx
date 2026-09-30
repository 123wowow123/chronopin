'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { isStoreWordmark, StoreLogo } from '@/components/pin/StoreLogo';
import { useT } from '@/lib/client/i18n';
import { money } from '@/lib/format';
import { withMatches, type ShopLink, type ShopMatch } from '@/lib/shopping';

// The "Buy on" row: the pin's stored listings, then a search of each store it
// has none on (src/lib/shopping.ts), in the store's colours. A store whose
// exact listing is found live (/api/pins/:id/shop, eBay) swaps its search for
// that listing and its price once the answer comes. Each click is reported
// (/api/pins/:id/shop-click).
export function ShopButtons({ pinId, links, productName }: { pinId: number; links: ShopLink[]; productName?: string | null }) {
  const t = useT();
  const [matches, setMatches] = useState<ShopMatch[]>([]);
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

  // Counted for the admin Clicks page as the store opens: a beacon survives
  // the tab switching away, and nothing waits for it.
  const report = (link: ShopLink) => {
    const body = JSON.stringify({ store: link.store, url: link.url, search: link.search, price: link.price, currency: link.currency });
    try {
      navigator.sendBeacon(`/api/pins/${pinId}/shop-click`, new Blob([body], { type: 'application/json' }));
    } catch {}
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="me-1 text-xs font-semibold tracking-wider text-subtle uppercase">{t('pin.buyOnHeading')}</span>
      {withMatches(links, matches).map((link) => (
        <a
          key={link.store + link.url}
          href={link.url}
          target="_blank"
          rel="noopener nofollow sponsored"
          onClick={() => report(link)}
          onAuxClick={(event) => event.button === 1 && report(link)}
          title={link.search ? t('pin.searchStore', { store: link.store, product: productName ?? '' }) : t('pin.buyOn', { store: link.store })}
          className={`btn h-8 gap-1.5 px-3 py-0 shadow-sm transition hover:-translate-y-px hover:shadow-md ${link.background ? 'border border-white/15 hover:brightness-110' : 'btn-secondary'}`}
          style={link.background ? { backgroundColor: link.background, color: link.text, borderColor: link.border } : undefined}
        >
          {/* The store's own mark; a store we have no colours for gets
              the plain search or cart icon instead. */}
          {link.background ? (
            <StoreLogo store={link.store} className={isStoreWordmark(link.store) ? 'h-5 w-auto shrink-0' : 'size-4 shrink-0'} />
          ) : (
            <Icon name={link.search ? 'search' : 'cart'} className="size-4" />
          )}
          {isStoreWordmark(link.store) ? <span className="sr-only">{link.store}</span> : link.store}
          {link.price ? <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-xs">{money(link.price, link.currency)}</span> : null}
          <Icon name="external" className="size-3 shrink-0 opacity-60" />
        </a>
      ))}
    </div>
  );
}
