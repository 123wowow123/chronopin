'use client';

import { useEffect, useRef, useState } from 'react';
import { hasProgramLogo, ProgramLogo } from '@/components/ads/ProgramLogo';
import { PinThumb } from '@/components/pin/PinThumb';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { money } from '@/lib/format';
import { SLOT_COUNT, type AdJson, type AdSlot } from '@/lib/ads';

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
  prime: { icon: 'bolt', background: '#00a8e1', color: '#fff' },
  audible: { icon: 'sparkle', background: '#f7991c', color: '#1d1d1d' },
  business: { icon: 'briefcase', background: '#232f3e', color: '#fff' },
  primevideo: { icon: 'play', background: '#1a98ff', color: '#fff' },
  haul: { icon: 'tag', background: '#6d28d9', color: '#fff' },
  fresh: { icon: 'cart', background: '#3f8f1f', color: '#fff' },
  pets: { icon: 'smile', background: '#ff9900', color: '#1d1d1d' },
  tradein: { icon: 'reply', background: '#146eb4', color: '#fff' },
};
const DEFAULT_TILE = { icon: 'cart' as IconName, background: '#232f3e', color: '#fff' };

function useAds(slot: AdSlot, pinId: number | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const [ads, setAds] = useState<AdJson[] | null>(null);

  useEffect(() => {
    // Kept when the page is hidden and shown again (React Activity).
    if (ads) return;
    const element = ref.current;
    if (!element) return;
    let cancelled = false;
    const scope = pinId ? `pin:${pinId}` : slot === 'drawer' ? 'drawer' : 'timeline';
    const load = () => {
      queue = queue.then(() => {
        if (cancelled) return;
        const shown = onPage.get(scope) ?? new Set<string>();
        onPage.set(scope, shown);
        const params = new URLSearchParams({ slot, n: String(SLOT_COUNT[slot]) });
        if (pinId) params.set('pin', String(pinId));
        if (shown.size) params.set('not', [...shown].slice(-100).join(','));
        return fetch(`/api/ads?${params}`)
          .then((res) => (res.ok ? (res.json() as Promise<{ ads: AdJson[] }>) : null))
          .then((body) => {
            if (cancelled) return;
            const list = body?.ads ?? [];
            for (const ad of list) shown.add(ad.key);
            setAds(list);
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
  }, [ads, slot, pinId]);

  return { ref, ads };
}

// Counted for the admin Ads page as the store opens, with the page it was on:
// a beacon survives the tab switching away, and nothing waits for it.
function report(ad: AdJson, slot: AdSlot, pinId: number | undefined) {
  try {
    const page = `${location.pathname}${location.search}`.slice(0, 500);
    navigator.sendBeacon('/api/ads/click', new Blob([JSON.stringify({ key: ad.key, slot, pinId, page })], { type: 'application/json' }));
  } catch {}
}

function useAdText() {
  const t = useT();
  return (ad: AdJson) => {
    if (ad.program) {
      const base = `ads.programs.${ad.program}`;
      return {
        title: t.dynamic(`${base}.title`, ad.program),
        body: t.dynamic(`${base}.body`, ''),
        cta: t.dynamic(`${base}.cta`, t('ads.seeOnAmazon')),
      };
    }
    return { title: ad.title ?? '', body: ad.price != null ? money(ad.price, ad.currency) : '', cta: t('ads.seeOnAmazon') };
  };
}

function AdPicture({ ad, className }: { ad: AdJson; className: string }) {
  if (!ad.program) return <PinThumb thumbName={ad.thumbName} originalUrl={ad.originalUrl} title={ad.title} category={ad.category} className={className} />;
  if (hasProgramLogo(ad.program)) {
    return (
      <span aria-hidden className={`flex shrink-0 items-center justify-center rounded border border-line bg-white p-2 ${className}`}>
        <ProgramLogo program={ad.program} className="h-full w-full" />
      </span>
    );
  }
  const tile = PROGRAM_TILE[ad.program] ?? DEFAULT_TILE;
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded ${className}`} style={{ background: tile.background, color: tile.color }}>
      <Icon name={tile.icon} className="size-1/2 max-h-8 max-w-8" />
    </span>
  );
}

function AdLink({ ad, slot, pinId, className, children }: { ad: AdJson; slot: AdSlot; pinId?: number; className: string; children: React.ReactNode }) {
  return (
    <a
      href={ad.url}
      target="_blank"
      rel="noopener nofollow sponsored"
      onClick={() => report(ad, slot, pinId)}
      onAuxClick={(event) => event.button === 1 && report(ad, slot, pinId)}
      className={className}
    >
      {children}
    </a>
  );
}

function Disclosure({ className = '' }: { className?: string }) {
  const t = useT();
  return <p className={`text-[11px] leading-snug text-subtle ${className}`}>{t('pin.amazonDisclosure')}</p>;
}

function SponsoredLabel() {
  const t = useT();
  return <span className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{t('ads.sponsored')}</span>;
}

// One row of ads across the content: between the timeline's days (three on
// a desktop, two on a tablet, one on a phone) or under a pin's tags (two
// beside the pin, one on a phone). `className` places it.
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
      : 'grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-sm:[&>li:nth-child(n+2)]:hidden';
  return (
    <aside aria-label={t('ads.sponsored')} className={className}>
      <div className="mb-1.5 flex items-baseline gap-2">
        <SponsoredLabel />
      </div>
      <ul className={list}>
        {ads.map((ad) => {
          const { title, body, cta } = text(ad);
          return (
            <li key={ad.key} className="min-w-0">
              <AdLink ad={ad} slot={slot} pinId={pinId} className="surface flex h-full items-center gap-3 p-2.5 hover:no-underline hover:ring-1 hover:ring-line">
                <AdPicture ad={ad} className={slot === 'timeline-row' ? 'h-14 w-20' : 'size-11'} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-ink" title={title}>
                    {title}
                  </span>
                  {body ? <span className={`text-xs text-muted ${ad.program ? 'line-clamp-1' : 'font-semibold text-success tabular-nums'}`}>{body}</span> : null}
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-link">
                    {cta}
                    <Icon name="external" className="size-3 opacity-60" />
                  </span>
                </span>
              </AdLink>
            </li>
          );
        })}
      </ul>
      <Disclosure className="mt-1.5" />
    </aside>
  );
}

// The tall space under a pin's comments: a column of larger ads on a desktop,
// only the first on a phone.
export function AdColumn({ pinId, className = '' }: { pinId: number; className?: string }) {
  const slot = 'pin-side';
  const t = useT();
  const { ref, ads } = useAds(slot, pinId);
  const text = useAdText();
  if (!ads) return <div ref={ref} aria-hidden className={`h-px ${className}`} />;
  if (!ads.length) return null;
  return (
    <aside aria-label={t('ads.sponsored')} className={`surface p-4 sm:p-5 ${className}`}>
      <SponsoredLabel />
      <ul className="mt-2 space-y-2 max-lg:[&>li:nth-child(n+2)]:hidden">
        {ads.map((ad) => {
          const { title, body, cta } = text(ad);
          return (
            <li key={ad.key}>
              <AdLink ad={ad} slot={slot} pinId={pinId} className="-mx-2 flex items-center gap-3.5 rounded-lg p-2 hover:bg-raised hover:no-underline">
                <AdPicture ad={ad} className="h-20 w-28" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="line-clamp-2 font-medium text-ink">{title}</span>
                  {body ? <span className={`text-sm ${ad.program ? 'line-clamp-2 text-muted' : 'font-semibold text-success tabular-nums'}`}>{body}</span> : null}
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-link">
                    {cta}
                    <Icon name="external" className="size-3 opacity-60" />
                  </span>
                </span>
              </AdLink>
            </li>
          );
        })}
      </ul>
      <Disclosure className="mt-2" />
    </aside>
  );
}

// A panel beside the timeline on wide screens, under trending and new pins,
// with rows like theirs. It splits the column's room with them and, like
// them, shows only whole rows (src/lib/client/wholeRows.ts); `onAds` says how
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
    <section ref={ref} aria-labelledby="ad-panel-heading" aria-busy={!ads} className="floating flex max-h-max min-h-0 grow basis-28 flex-col text-sm">
      {/* The disclosure sits under the heading: under the list it would be
          cut off with the rows that do not fit. */}
      <div className="shrink-0 px-3.5 pt-2.5 pb-1">
        <h2 id="ad-panel-heading" className="flex items-center gap-2">
          <Icon name="cart" className="size-4 text-link" />
          <SponsoredLabel />
        </h2>
        <Disclosure className="mt-0.5" />
      </div>
      <ol className="flex min-h-0 flex-col flex-wrap overflow-clip pb-1.5">
        {ads
          ? ads.map((ad) => {
              const { title, body } = text(ad);
              return (
                <li key={ad.key} className="w-full px-1.5">
                  <AdLink ad={ad} slot={slot} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-raised hover:no-underline">
                    <AdPicture ad={ad} className="h-9 w-14" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate leading-snug text-ink" title={title}>
                        {title}
                      </span>
                      <span className={`truncate text-xs ${ad.program ? 'text-subtle' : 'font-semibold text-success tabular-nums'}`}>{body}</span>
                    </span>
                  </AdLink>
                </li>
              );
            })
          : Array.from({ length: SLOT_COUNT[slot] }, (_, i) => (
              <li key={i} aria-hidden className="w-full px-1.5">
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                  <span className="h-9 w-14 shrink-0 rounded bg-raised" />
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

// The mobile menu's ads, above Log out: at most two compact rows like the
// side panel's, in the room the menu leaves. The block gives way before the
// menu scrolls: it is the one thing that shrinks, and a row that does not fit
// wraps into a clipped second column, as the side panel's do. The drawer is
// always mounted, so the ads are fetched once, the first time it is opened
// into view.
export function AdDrawer({ className = '' }: { className?: string }) {
  const slot = 'drawer';
  const t = useT();
  const { ref, ads } = useAds(slot, undefined);
  const text = useAdText();
  if (!ads) return <div ref={ref} aria-hidden className={`h-px ${className}`} />;
  if (!ads.length) return null;
  return (
    <aside aria-label={t('ads.sponsored')} className={`flex min-h-0 shrink flex-col px-2 pt-1 pb-1 ${className}`}>
      <div className="shrink-0 px-3 pb-0.5">
        <SponsoredLabel />
        <Disclosure className="mt-0.5" />
      </div>
      <ul className="flex min-h-0 flex-col flex-wrap overflow-clip">
        {ads.map((ad) => {
          const { title, body } = text(ad);
          return (
            <li key={ad.key} className="w-full">
              <AdLink ad={ad} slot={slot} className="flex items-center gap-3 rounded-2xl px-3 py-1.5 hover:bg-raised hover:no-underline active:bg-raised-2">
                <AdPicture ad={ad} className="h-9 w-14" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-ink" title={title}>
                    {title}
                  </span>
                  {body ? <span className={`truncate text-xs ${ad.program ? 'text-subtle' : 'font-semibold text-success tabular-nums'}`}>{body}</span> : null}
                </span>
              </AdLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
