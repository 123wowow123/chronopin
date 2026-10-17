'use client';

import Anchor from '@/components/ui/Anchor';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { hasProgramLogo, ProgramLogo } from '@/components/ads/ProgramLogo';
import { RestaurantAdCard } from '@/components/restaurants/RestaurantAdCard';
import { PinThumb } from '@/components/pin/PinThumb';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { withPageLang } from '@/lib/client/navigation';
import { isAwinUrl, isEbayUrl } from '@/lib/affiliate';
import { money } from '@/lib/format';
import { creativeProblem } from '@/lib/sponsoredAds';
import { MAP_STRIP_PINS, MAP_STRIP_REFRESH_MS, parseUrgency, SLOT_COUNT, type AdJson, type AdSlot } from '@/lib/ads';

// The ad slots marked on the timeline and the pin page, filled with Amazon
// Associates ads (/api/ads, src/lib/ads.ts): program ads (Special Program
// Commissions, Bonus Events, Trade-In) and the Amazon listings on pins,
// weighed by the viewer's preference wiki, age and - on a pin page - the pin.
//
// Fetched once the block comes within a screen of view, so an ad counted as
// shown was near being seen, and never during a prerender. Each click is
// reported (/api/ads/click) as the store opens. A block with no ads draws
// nothing.
//
// Desktop's taller spaces take several rows (the pin page's side column, the
// timeline's side panel); on a phone every block is one row, one ad.

// Ads already on the page, sent as ?not= so the other blocks pick others. Kept
// per page - a pin's, or the timeline - since pages stay mounted behind each
// other (React Activity) and an ad seen on the timeline is still fine on a
// pin's own page. Blocks ask one after another, so each one's answer is on
// the list before the next asks; asking together, they would all pick alike.
const onPage = new Map<string, Set<string>>();
let queue: Promise<unknown> = Promise.resolve();

// A program's mark: its icon on its colour.
const PROGRAM_TILE: Record<string, { icon: IconName; background: string; color: string }> = {
  // Our own ad for the self-serve portal, and the plain tile of a bought ad with no picture.
  advertise: { icon: 'sparkle', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff' },
  // Our own ad for the heavy user plan (0191): amber to rose, a bolt for speed.
  heavyuser: { icon: 'bolt', background: 'linear-gradient(135deg, #f59e0b 0%, #e11d48 100%)', color: '#fff' },
  sponsored: { icon: 'tag', background: '#334155', color: '#fff' },
  prime: { icon: 'bolt', background: '#00a8e1', color: '#fff' },
  audible: { icon: 'sparkle', background: '#f7991c', color: '#1d1d1d' },
  business: { icon: 'briefcase', background: '#232f3e', color: '#fff' },
  primevideo: { icon: 'play', background: '#1a98ff', color: '#fff' },
  haul: { icon: 'tag', background: '#6d28d9', color: '#fff' },
  fresh: { icon: 'cart', background: '#3f8f1f', color: '#fff' },
  pets: { icon: 'smile', background: '#ff9900', color: '#1d1d1d' },
  tradein: { icon: 'reply', background: '#146eb4', color: '#fff' },
  babyregistry: { icon: 'smile', background: '#f9a8c9', color: '#1d1d1d' },
  weddingregistry: { icon: 'sparkle', background: '#be185d', color: '#fff' },
  musicunlimited: { icon: 'play', background: '#25d1da', color: '#1d1d1d' },
  kindleunlimited: { icon: 'eye', background: '#232f3e', color: '#fff' },
  subscribesave: { icon: 'clock', background: '#e47911', color: '#fff' },
  // Abracadabra NYC (0134, CJ Affiliate): a violet-to-midnight wash with a gold sparkle.
  abracadabra: { icon: 'sparkle', background: 'linear-gradient(135deg, #4c1d95 0%, #1e1033 100%)', color: '#f5d77a' },
  // Watch brands (0130): the house's own colour behind a clock.
  watch_rolex: { icon: 'clock', background: '#0b5d3b', color: '#e9d8a6' },
  watch_omega: { icon: 'clock', background: '#c8102e', color: '#fff' },
  watch_patek: { icon: 'clock', background: '#1f3a5f', color: '#e9d8a6' },
  watch_ap: { icon: 'clock', background: '#1b1b1b', color: '#d8c9a3' },
  watch_cartier: { icon: 'clock', background: '#a6192e', color: '#fff' },
  watch_tudor: { icon: 'clock', background: '#b3141a', color: '#fff' },
  watch_breitling: { icon: 'clock', background: '#f2c200', color: '#1d1d1d' },
  watch_tag: { icon: 'clock', background: '#00843d', color: '#fff' },
  watch_iwc: { icon: 'clock', background: '#2b2b2b', color: '#fff' },
  watch_gs: { icon: 'clock', background: '#3b4a5a', color: '#fff' },
  sneaker_af1: { icon: 'tag', background: '#262626', color: '#fff' },
  sneaker_dunk: { icon: 'tag', background: '#c2410c', color: '#fff' },
  sneaker_jordan: { icon: 'tag', background: '#b91c1c', color: '#fff' },
  sneaker_samba: { icon: 'tag', background: '#171717', color: '#fff' },
  sneaker_nb: { icon: 'tag', background: '#475569', color: '#fff' },
  sneaker_asics: { icon: 'tag', background: '#1e3a8a', color: '#fff' },
  // brkox (0165, Awin): light kits glow, frames and cases are quieter.
  lego_lights: { icon: 'bolt', background: '#111827', color: '#fcd34d' },
  lego_frames: { icon: 'eye', background: '#1f2937', color: '#fff' },
  lego_cases: { icon: 'eye', background: '#334155', color: '#fff' },
  lego_movies: { icon: 'play', background: '#111827', color: '#fcd34d' },
  lego_cars: { icon: 'bolt', background: '#b91c1c', color: '#fff' },
  lego_space: { icon: 'sparkle', background: '#1e1b4b', color: '#fcd34d' },
  lego_buildings: { icon: 'bolt', background: '#78350f', color: '#fde68a' },
  lego_christmas: { icon: 'sparkle', background: '#166534', color: '#fecaca' },
  // TideWe (0166, Awin): field colors.
  hunting_blinds: { icon: 'eye', background: '#3f4a2f', color: '#fff' },
  hunting_waders: { icon: 'tag', background: '#1f3b2d', color: '#fff' },
  hunting_heated: { icon: 'bolt', background: '#9a3412', color: '#fff' },
  hunting_boots: { icon: 'tag', background: '#44403c', color: '#fde68a' },
  hunting_clothing: { icon: 'tag', background: '#365314', color: '#fff' },
  hunting_packs: { icon: 'tag', background: '#292524', color: '#fcd34d' },
  // World Businesses for Sale (0175, Awin): ledger blues and greens.
  business_premium: { icon: 'sparkle', background: '#1e293b', color: '#fcd34d' },
  business_online: { icon: 'bolt', background: '#1e3a8a', color: '#fff' },
  business_food: { icon: 'tag', background: '#9a3412', color: '#fff' },
  business_retail: { icon: 'cart', background: '#0f766e', color: '#fff' },
  business_services: { icon: 'tag', background: '#334155', color: '#fff' },
  business_franchises: { icon: 'tag', background: '#4c1d95', color: '#fff' },
  business_home: { icon: 'eye', background: '#166534', color: '#fff' },
  business_us: { icon: 'eye', background: '#7f1d1d', color: '#fff' },
};
// Programs whose own picture sits on their tile (a file in public/ads).
const PROGRAM_IMAGE: Record<string, string> = { abracadabra: '/ads/abracadabra.png' };
const DEFAULT_TILE = { icon: 'cart' as IconName, background: '#232f3e', color: '#fff' };

export function useAds(slot: AdSlot, pinId: number | undefined, count = SLOT_COUNT[slot]) {
  const ref = useRef<HTMLDivElement>(null);
  const [ads, setAds] = useState<AdJson[] | null>(null);
  const [requestedCount, setRequestedCount] = useState(0);

  useEffect(() => {
    // Kept when the page is hidden and shown again (React Activity).
    if (requestedCount >= count) return;
    const element = ref.current;
    if (!element) return;
    let cancelled = false;
    const scope = pinId ? `pin:${pinId}` : slot === 'drawer' ? 'drawer' : slot === 'card-grid' ? 'cards' : 'timeline';
    const load = () => {
      queue = queue.then(() => {
        if (cancelled) return;
        const shown = onPage.get(scope) ?? new Set<string>();
        onPage.set(scope, shown);
        const needed = Math.min(SLOT_COUNT[slot], Math.max(1, count - (ads?.length ?? 0)));
        const params = new URLSearchParams({ slot, n: String(needed) });
        if (pinId) params.set('pin', String(pinId));
        if (shown.size) params.set('not', [...shown].slice(-100).join(','));
        return fetch(withPageLang(`/api/ads?${params}`))
          .then((res) => (res.ok ? (res.json() as Promise<{ ads: AdJson[] }>) : null))
          .then((body) => {
            if (cancelled) return;
            const existing = new Set(ads?.map((ad) => ad.key));
            const list = (body?.ads ?? []).filter((ad) => !existing.has(ad.key));
            for (const ad of list) shown.add(ad.key);
            setAds((current) => [...(current ?? []), ...list]);
            // Fetch more batches only while the inventory provides new ads.
            setRequestedCount(list.length < needed ? count : (ads?.length ?? 0) + list.length);
          })
          .catch(() => {});
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: '100% 0px' },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [ads, slot, pinId, count, requestedCount]);

  return { ref, ads };
}

// Counted for the admin Ads page as the store opens, with the page it was on:
// a beacon survives the tab switching away, and nothing waits for it.
function report(ad: AdJson, slot: AdSlot, pinId: number | undefined) {
  try {
    const page = `${location.pathname}${location.search}`.slice(0, 500);
    navigator.sendBeacon('/api/ads/click', new Blob([JSON.stringify({ key: ad.key, slot, pinId, page, store: ad.store })], { type: 'application/json' }));
  } catch {}
}

export function useAdText() {
  const t = useT();
  return (ad: AdJson) => {
    // A brkox collection: its name, then one line that is also the trademark note.
    // An ad someone bought through the portal: their own headline and text.
    if (ad.kind === 'sponsored') {
      return { title: ad.title ?? '', body: ad.body ?? '', price: '', info: ad.body ?? '', urgency: '', cta: t.dynamic('ads.programs.sponsored.cta', 'Visit site') };
    }
    if (ad.kind === 'lego') {
      const line = t('ads.legoBody');
      return { title: ad.title ?? '', body: line, price: '', info: line, urgency: '', cta: t('ads.seeOnBrkox') };
    }
    if (ad.kind === 'hunting') {
      const line = t('ads.huntingBody');
      return { title: ad.title ?? '', body: line, price: '', info: line, urgency: '', cta: t('ads.seeOnTidewe') };
    }
    if (ad.kind === 'business') {
      const line = t('ads.businessBody');
      return { title: ad.title ?? '', body: line, price: '', info: line, urgency: '', cta: t('ads.seeOnWbfs') };
    }
    if (ad.kind === 'sneaker') {
      const price = ad.price != null ? money(ad.price, ad.currency) : '';
      const info = ad.brand ?? '';
      return { title: ad.title ?? '', body: [price, info].filter(Boolean).join(' · '), price, info, urgency: '', cta: t('ads.seeOnEbay') };
    }
    // A watch brand's ad: the brand's name, then the same line for every brand.
    if (ad.kind === 'watch') {
      const line = t('ads.watchBody', { brand: ad.title ?? '' });
      // With a live listing the price leads: "$9,800 · Pre-owned Rolex watches ...".
      const price = ad.price != null ? money(ad.price, ad.currency) : '';
      return { title: ad.title ?? '', body: [price, line].filter(Boolean).join(' · '), price, info: line, urgency: '', cta: t('ads.seeOnEbay') };
    }
    if (ad.program) {
      const base = `ads.programs.${ad.program}`;
      const body = t.dynamic(`${base}.body`, '');
      return { title: t.dynamic(`${base}.title`, ad.program), body, price: '', info: body, urgency: '', cta: t.dynamic(`${base}.cta`, t('ads.seeOnAmazon')) };
    }
    const price = ad.price != null ? money(ad.price, ad.currency) : '';
    // "Only 12 left" or "90-day low price", when the listing's page said so.
    const found = parseUrgency(ad.urgency);
    const urgency = found ? (found.kind === 'left' ? t('ads.urgencyLeft', { count: found.count }) : t('ads.urgencyLow', { days: found.days })) : '';
    // The one line about a product in the compact rows, after the price: the
    // urgency where there is one, else brand and stars.
    // A holiday's ad says which holiday it is for in place of the brand.
    const info = urgency || [ad.holiday ?? ad.brand, ad.rating ? `★ ${ad.rating.toFixed(1)}` : null].filter(Boolean).join(' · ');
    return { title: ad.title ?? '', body: [price, ad.holiday].filter(Boolean).join(' · '), price, info, urgency, cta: t('ads.seeOnAmazon') };
  };
}

// The compact rows' second line: a product's price, brand and stars, or a
// program's own words, on one line that gives way with an ellipsis where the
// row is too narrow, as a new pin's text does.
function AdInfoLine({ price, info, urgent }: { price: string; info: string; urgent?: boolean }) {
  return (
    <span className={`truncate text-xs ${urgent ? 'font-medium text-warning' : 'text-subtle'}`}>
      {price ? <span className="font-semibold text-success tabular-nums">{price}</span> : null}
      {price && info ? ' · ' : null}
      {info}
    </span>
  );
}

export function AdPicture({ ad, className }: { ad: AdJson; className: string }) {
  // Fill the thumbnail instead of letterboxing square product photos in a
  // landscape slot. Keep the crop centred on the product and its label.
  if (ad.imageUrl) {
    return (
      <span aria-hidden className={`flex shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Amazon's own image host */}
        <img src={ad.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover object-center transition-transform duration-[400ms] ease-out [a:hover_&]:scale-[1.08] motion-reduce:transition-none motion-reduce:[a:hover_&]:scale-100" />
      </span>
    );
  }
  if (!ad.program) return <PinThumb thumbName={ad.thumbName} originalUrl={ad.originalUrl} title={ad.title} category={ad.category} className={className} />;
  if (hasProgramLogo(ad.program)) {
    return (
      <span aria-hidden className={`flex shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-white p-2 ${className}`}>
        <ProgramLogo program={ad.program} className="h-full w-full transition-transform duration-[400ms] ease-out [a:hover_&]:scale-[1.08] motion-reduce:transition-none motion-reduce:[a:hover_&]:scale-100" />
      </span>
    );
  }
  const tile = PROGRAM_TILE[ad.program] ?? DEFAULT_TILE;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center overflow-hidden rounded ${className}`} style={{ background: tile.background, color: tile.color }}>
      {PROGRAM_IMAGE[ad.program] ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small static logo on the tile
        <img src={PROGRAM_IMAGE[ad.program]} alt="" loading="lazy" className="size-full object-contain p-1 transition-transform duration-[400ms] ease-out [a:hover_&]:scale-[1.08] motion-reduce:transition-none motion-reduce:[a:hover_&]:scale-100" />
      ) : (
        <Icon name={tile.icon} className="size-1/2 max-h-8 max-w-8 transition-transform duration-[400ms] ease-out [a:hover_&]:scale-[1.08] motion-reduce:transition-none motion-reduce:[a:hover_&]:scale-100" />
      )}
    </span>
  );
}

export function AdLink({ ad, slot, pinId, className, children }: { ad: AdJson; slot: AdSlot; pinId?: number; className: string; children: React.ReactNode }) {
  return (
    <Anchor
      href={ad.url}
      // Our own page (the "Advertise" tile) opens in this tab; every other ad leaves the site.
      target={ad.url.startsWith('/') ? undefined : '_blank'}
      rel="noopener nofollow sponsored"
      onClick={() => report(ad, slot, pinId)}
      onAuxClick={(event) => event.button === 1 && report(ad, slot, pinId)}
      className={className}
    >
      {children}
    </Anchor>
  );
}

type TileText = { title: string; body: string; urgency: string; cta: string };

// Preview destinations open directly, without recording an ad click. A form
// with an unfinished or invalid URL keeps its preview non-interactive.
export function AdPreviewLink({ ad, className, children }: { ad: AdJson; className: string; children: React.ReactNode }) {
  if (creativeProblem({ title: 'Preview', url: ad.url })) return <div className={className}>{children}</div>;
  return <a href={ad.url.trim()} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}

// What one ad shows inside a row of the timeline (and beside a pin's tags):
// the picture, the title, the line under it and the link's words.
function RowTileContent({ ad, wide, title, body, urgency, cta }: { ad: AdJson; wide: boolean } & TileText) {
  return (
    <>
      <AdPicture ad={ad} className={wide ? 'h-14 w-20' : 'h-12 w-[4.5rem]'} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-ink" title={title}>
          {title}
        </span>
        {body ? <span className={`text-xs text-muted ${ad.program ? 'line-clamp-1' : 'font-semibold text-success tabular-nums'}`}>{body}</span> : null}
        {urgency ? <span className="truncate text-xs font-medium text-warning">{urgency}</span> : null}
        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-link">
          {cta}
          <Icon name="external" className="size-3 opacity-60" />
        </span>
      </span>
    </>
  );
}

// The same for the larger rows of the column under a pin's comments.
function ColumnRowContent({ ad, title, body, urgency, cta }: { ad: AdJson } & TileText) {
  return (
    <>
      <AdPicture ad={ad} className="h-20 w-28" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 font-medium text-ink">{title}</span>
        {body ? <span className={`text-sm ${ad.program ? 'line-clamp-2 text-muted' : 'font-semibold text-success tabular-nums'}`}>{body}</span> : null}
        {urgency ? <span className="text-sm font-medium text-warning">{urgency}</span> : null}
        <span className="inline-flex items-center gap-1 text-sm font-medium text-link">
          {cta}
          <Icon name="external" className="size-3 opacity-60" />
        </span>
      </span>
    </>
  );
}

// How a self-serve ad (SponsoredAd) looks on the site, drawn by the very
// markup the live rows use: on a pin's page (the column under its comments)
// and on the timeline. `layout` picks one, or both stacked. Nothing in it is
// tracked; links open the destination for the advertiser and admin to review.
export function AdPreview({
  title,
  body,
  url,
  imageUrl,
  layout = 'both',
  sideBySide = false,
  className = '',
}: {
  title: string;
  body: string;
  url: string;
  imageUrl: string | null;
  layout?: 'both' | 'pin' | 'timeline' | 'card';
  // The two layouts next to each other on a wide screen, for a short block.
  sideBySide?: boolean;
  className?: string;
}) {
  const text = useAdText();
  const ad: AdJson = {
    key: 'u:preview',
    kind: 'sponsored',
    program: 'sponsored',
    url,
    title: title.trim() || 'Your headline',
    body: body.trim() || null,
    price: null,
    currency: null,
    pinId: null,
    category: null,
    thumbName: null,
    originalUrl: null,
    imageUrl,
    store: 'US',
  };
  const shown = text(ad);
  return (
    <div className={sideBySide ? `grid items-start gap-3 sm:grid-cols-2 ${className}` : `space-y-3 ${className}`}>
      {layout === 'pin' ? (
        <div>
          <div className="surface p-4 sm:p-5">
            <AdPreviewLink ad={ad} className="-mx-2 flex items-center gap-3.5 rounded-lg p-2 hover:no-underline">
              <ColumnRowContent ad={ad} {...shown} />
            </AdPreviewLink>
          </div>
        </div>
      ) : null}
      {layout === 'both' || layout === 'timeline' ? (
        <div>
          {layout === 'both' ? <p className="mb-1 text-xs text-subtle">In lists: the timeline, pin pages, the side panel, the menu and the map</p> : null}
          <div className="mx-auto max-w-[448px]">
            <AdPreviewLink ad={ad} className="surface flex items-center gap-3 p-2.5 hover:no-underline">
              <RowTileContent ad={ad} wide {...shown} />
            </AdPreviewLink>
          </div>
        </div>
      ) : null}
      {layout === 'both' || layout === 'card' ? (
        <div>
          {layout === 'both' ? <p className="mb-1 text-xs text-subtle">In restaurant, product and car guides</p> : null}
          <div className="mx-auto max-w-[22rem]">
            <RestaurantAdCard ad={ad} preview />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Disclosure({ ads, className = '' }: { ads?: AdJson[]; className?: string }) {
  const t = useT();
  const ebay = ads?.some((ad) => isEbayUrl(ad.url));
  const awin = ads?.some((ad) => isAwinUrl(ad.url));
  const text = [t('pin.amazonDisclosure'), ebay ? t('pin.ebayDisclosure') : '', awin ? t('pin.awinDisclosure') : ''].filter(Boolean).join(' ');
  return <p className={`text-[11px] leading-snug text-subtle ${className}`}>{text}</p>;
}

export function SponsoredLabel() {
  const t = useT();
  return <span className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{t('ads.sponsored')}</span>;
}

// One row of ads across the content: between the timeline's days (three on
// a desktop, two on a tablet, one on a phone) or under a pin's tags (two
// beside the pin, stacked on a phone). `className` places it.
export function AdRow({ slot, pinId, className = '' }: { slot: 'timeline-row' | 'pin-strip'; pinId?: number; className?: string }) {
  const t = useT();
  const { ref, ads } = useAds(slot, pinId);
  const text = useAdText();
  if (!ads) return <div ref={ref} aria-hidden className={`h-px ${className}`} />;
  if (!ads.length) return null;
  // Between days the ads share the row the day's cards spread across,
  // centred under them, one more for each width the cards widen into, each
  // at most a card's width. Beside a pin, two to a row.
  const list =
    slot === 'timeline-row'
      ? 'flex justify-center gap-2.5 [&>li]:max-w-[448px] [&>li]:flex-1 [&>li]:basis-0 max-sm:[&>li:nth-child(n+2)]:hidden max-lg:[&>li:nth-child(n+3)]:hidden max-3xl:[&>li:nth-child(n+4)]:hidden max-4xl:[&>li:nth-child(n+5)]:hidden max-5xl:[&>li:nth-child(n+6)]:hidden max-6xl:[&>li:nth-child(n+7)]:hidden'
      : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2';
  return (
    <aside aria-label={t('ads.sponsored')} className={className}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <SponsoredLabel />
      </div>
      <ul className={list}>
        {ads.map((ad) => {
          const { title, body, urgency, cta } = text(ad);
          return (
            <li key={ad.key} className="min-w-0">
              <AdLink ad={ad} slot={slot} pinId={pinId} className="surface flex h-full items-center gap-3 p-2.5 hover:no-underline hover:ring-1 hover:ring-line">
                <RowTileContent ad={ad} wide={slot === 'timeline-row'} title={title} body={body} urgency={urgency} cta={cta} />
              </AdLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

// The tall space under a pin's comments: a column of larger ads on a desktop,
// only the first two on a phone. Up to ten are fetched; on a desktop only as
// many show as fit beside the pin's own column (the references and suggest
// blocks), never fewer than two, so the ads never make the page taller.
export function AdColumn({ pinId, className = '' }: { pinId: number; className?: string }) {
  const slot = 'pin-side';
  const t = useT();
  const { ref, ads } = useAds(slot, pinId);
  const text = useAdText();
  const listRef = useRef<HTMLUListElement>(null);
  const adCount = ads?.length ?? 0;
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || adCount < 3) return;
    const grid = list.closest<HTMLElement>('[data-pin-grid]');
    const end = grid?.querySelector<HTMLElement>('[data-pin-main-end]');
    if (!grid || !end) return;
    const items = [...list.children] as HTMLElement[];
    const wide = window.matchMedia('(min-width: 1024px)');
    const fit = () => {
      for (const item of items) item.style.display = '';
      if (!wide.matches) return;
      // The bottom of the left column's last block, not the grid row, which
      // stretches to hold this column.
      const content = end.lastElementChild as HTMLElement | null;
      if (!content) return;
      const limit = content.getBoundingClientRect().bottom;
      for (let i = items.length - 1; i >= 2 && list.getBoundingClientRect().bottom > limit; i--) items[i].style.display = 'none';
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(grid);
    observer.observe(end);
    wide.addEventListener('change', fit);
    return () => {
      observer.disconnect();
      wide.removeEventListener('change', fit);
    };
  }, [adCount]);
  if (!ads) return <div ref={ref} aria-hidden className={`h-px ${className}`} />;
  if (!ads.length) return null;
  return (
    <aside aria-label={t('ads.sponsored')} className={`surface p-4 sm:p-5 ${className}`}>
      <SponsoredLabel />
      <ul ref={listRef} className="mt-2 space-y-2 max-lg:[&>li:nth-child(n+3)]:hidden">
        {ads.map((ad) => {
          const { title, body, urgency, cta } = text(ad);
          return (
            <li key={ad.key}>
              <AdLink ad={ad} slot={slot} pinId={pinId} className="-mx-2 flex items-center gap-3.5 rounded-lg p-2 hover:bg-raised hover:no-underline">
                <ColumnRowContent ad={ad} title={title} body={body} urgency={urgency} cta={cta} />
              </AdLink>
            </li>
          );
        })}
      </ul>
      <Disclosure ads={ads} className="mt-2" />
    </aside>
  );
}

// A panel beside the timeline on wide screens, under trending and new pins,
// with rows like theirs. It splits the column's room with them and, like
// them, shows only whole rows (src/lib/client/wholeRows.ts), one at
// least, then only what trending and new pins leave; `onAds` says how
// many arrived (null while they are still coming) so the column is fitted
// again.
//
// The panel's room is claimed before the ads come: the frame and the
// disclosure draw at once over blank rows the height of real ones, so the
// ads fill them in place and trending and new pins are not resized and
// redrawn when they arrive. Only a block that comes back with no ads gives
// the room back.
export function AdPanel({ onAds }: { onAds?: (count: number | null) => void }) {
  const slot = 'timeline-side';
  const { ref, ads } = useAds(slot, undefined);
  const text = useAdText();
  const count = ads?.length ?? null;
  useEffect(() => {
    onAds?.(count);
  }, [count, onAds]);
  if (ads && !ads.length) return null;
  return (
    <section ref={ref} data-rows-last aria-labelledby="ad-panel-heading" aria-busy={!ads} className="floating flex max-h-max min-h-0 grow basis-28 flex-col text-sm">
      <div className="shrink-0 px-3.5 pt-2.5 pb-1">
        <h2 id="ad-panel-heading" className="flex items-center gap-2">
          <Icon name="cart" className="size-4 text-link" />
          <SponsoredLabel />
        </h2>
      </div>
      <ol className="flex min-h-0 flex-col flex-wrap overflow-clip pb-1.5">
        {ads
          ? ads.map((ad) => {
              const { title, price, info, urgency } = text(ad);
              return (
                <li key={ad.key} className="w-full px-1.5">
                  <AdLink ad={ad} slot={slot} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-raised hover:no-underline">
                    <AdPicture ad={ad} className="h-12 w-[4.5rem]" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate leading-snug text-ink" title={title}>
                        {title}
                      </span>
                      <AdInfoLine price={price} info={info} urgent={!!urgency} />
                    </span>
                  </AdLink>
                </li>
              );
            })
          : Array.from({ length: SLOT_COUNT[slot] }, (_, i) => (
              <li key={i} aria-hidden className="w-full px-1.5">
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                  <span className="h-12 w-[4.5rem] shrink-0 rounded bg-raised" />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="h-3 w-4/5 rounded bg-raised" />
                    <span className="h-2.5 w-3/5 rounded bg-raised" />
                  </span>
                </div>
              </li>
            ))}
      </ol>
    </section>
  );
}

// The mobile menu's ads, above Log out: compact rows filling the room the
// menu leaves, with five available initially. The block gives way
// before the menu scrolls: it is the one thing that shrinks, down to two rows,
// and a row that does not fit wraps into a clipped second column, as the side
// panel's do. The drawer is always mounted: it keeps its ads between opens
// and fetches additional, distinct rows when more room becomes available.
export function AdDrawer({ className = '' }: { className?: string }) {
  const slot = 'drawer';
  const t = useT();
  const [count, setCount] = useState(5);
  const { ref, ads } = useAds(slot, undefined, count);
  const text = useAdText();
  useEffect(() => {
    const section = ref.current;
    const drawer = section?.closest<HTMLElement>('[role="dialog"]');
    if (!section || !drawer) return;
    const fit = () => {
      const list = section.querySelector('ul');
      const row = list?.firstElementChild;
      const rowHeight = row?.getBoundingClientRect().height || 60;
      const headingHeight = list ? list.getBoundingClientRect().top - section.getBoundingClientRect().top : 64;
      let footerHeight = 0;
      for (let sibling = section.nextElementSibling; sibling; sibling = sibling.nextElementSibling) footerHeight += sibling.getBoundingClientRect().height;
      const room = drawer.getBoundingClientRect().bottom - section.getBoundingClientRect().top - drawer.scrollTop - headingHeight - footerHeight - 12;
      setCount(Math.min(20, Math.max(SLOT_COUNT.drawer, Math.floor(room / rowHeight))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(drawer);
    for (const child of drawer.children) if (child !== section) observer.observe(child);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [ads, ref]);
  if (!ads) return <div ref={ref} aria-hidden className={`h-px ${className}`} />;
  if (!ads.length) return null;
  return (
    <aside ref={ref} aria-label={t('ads.sponsored')} className={`flex min-h-40 flex-col px-2 pt-1 pb-1 ${className}`}>
      <div className="shrink-0 px-3 pb-0.5">
        <SponsoredLabel />
        <Disclosure ads={ads} className="mt-0.5" />
      </div>
      <ul className="flex min-h-24 flex-col flex-wrap overflow-clip">
        {ads.slice(0, count).map((ad) => {
          const { title, price, info, urgency } = text(ad);
          return (
            <li key={ad.key} className="w-full">
              <AdLink ad={ad} slot={slot} className="flex items-center gap-3 rounded-2xl px-3 py-1.5 hover:bg-raised hover:no-underline active:bg-raised-2">
                <AdPicture ad={ad} className="h-12 w-[4.5rem]" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-ink" title={title}>
                    {title}
                  </span>
                  <AdInfoLine price={price} info={info} urgent={!!urgency} />
                </span>
              </AdLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

// The row along the bottom of the map: ads picked for the pins in view, and
// picked again every 2.5 minutes (what is in view is read then, not as the map
// moves, so the row stays still while it is read). `getPinIds` answers which
// pins are in view; `ready` says the map has its pins. Paused while the tab or
// the page is hidden, and the row keeps its last ads if a fetch fails. As many
// as fit the width show, one on a phone.
export function AdMapStrip({ getPinIds, ready, className = '', style }: { getPinIds: () => number[]; ready: boolean; className?: string; style?: React.CSSProperties }) {
  const slot = 'map-strip';
  const t = useT();
  const text = useAdText();
  const [ads, setAds] = useState<AdJson[]>([]);
  const ref = useRef<HTMLElement>(null);
  // How many 14rem cards fit the row: one row only, the rest not drawn.
  const [fit, setFit] = useState(1);
  const getRef = useRef(getPinIds);
  useEffect(() => {
    getRef.current = getPinIds;
  }, [getPinIds]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let last = 0;
    const load = () => {
      const element = ref.current;
      // A page kept mounted but hidden (React Activity) takes no ads.
      if (document.hidden || (element && element.getClientRects().length === 0 && ads.length)) return;
      last = Date.now();
      const pins = getRef.current().slice(0, MAP_STRIP_PINS);
      const params = new URLSearchParams({ slot, n: String(SLOT_COUNT[slot]) });
      if (pins.length) params.set('pins', pins.join(','));
      // The ads on show now are skipped, so each round is a fresh row.
      const shown = ref.current ? [...ref.current.querySelectorAll<HTMLElement>('[data-ad-key]')].map((el) => el.dataset.adKey!) : [];
      if (shown.length) params.set('not', shown.join(','));
      fetch(withPageLang(`/api/ads?${params}`))
        .then((res) => (res.ok ? (res.json() as Promise<{ ads: AdJson[] }>) : null))
        .then((body) => {
          if (!cancelled && body?.ads.length) setAds(body.ads);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, MAP_STRIP_REFRESH_MS);
    // Back to a tab that sat hidden past a round: pick again at once.
    const visible = () => {
      if (!document.hidden && Date.now() - last >= MAP_STRIP_REFRESH_MS) load();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one loop per ready map
  }, [ready]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const width = element.getBoundingClientRect().width;
      // Under one card's width (between the toggle and the pills on a narrow desktop) nothing is drawn.
      setFit(Math.floor((width + 8) / (14 * rem + 8)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ads.length]);
  if (!ads.length) return <aside ref={ref} aria-hidden className={`invisible h-0 ${className}`} style={style} />;
  if (fit < 1) return <aside ref={ref} aria-hidden className={`invisible h-0 ${className}`} style={style} />;
  return (
    <aside ref={ref} aria-label={t('ads.sponsored')} className={className} style={style}>
      {/* Once, at the top left of the group. */}
      <div className="mb-0.5 ms-2 [text-shadow:0_0_3px_var(--color-panel),0_0_6px_var(--color-panel)]">
        <SponsoredLabel />
      </div>
      <ul className="flex justify-center gap-2 px-1 pb-1">
        {ads.slice(0, fit).map((ad) => {
          const { title, price, info, urgency } = text(ad);
          return (
            <li key={ad.key} data-ad-key={ad.key} className="min-w-0 max-w-[28rem] flex-1 basis-0">
              <AdLink ad={ad} slot={slot} className="floating flex h-full items-center gap-2.5 rounded-2xl p-2 hover:bg-raised hover:no-underline">
                <AdPicture ad={ad} className="h-12 w-16" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-snug font-medium text-ink" title={title}>
                    {title}
                  </span>
                  <AdInfoLine price={price} info={info} urgent={!!urgency} />
                </span>
              </AdLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
