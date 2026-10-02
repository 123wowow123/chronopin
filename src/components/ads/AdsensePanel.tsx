'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';
import { ADSENSE_CLIENT } from '@/lib/adsense';

// Google AdSense units (src/lib/adsense.ts) in the places the admin has given
// one: the timeline's side panel and the pin page's column under the comments,
// each in the frame its Amazon ads have, and a banner across the foot of a pin
// page. Google marks what it shows as an ad itself, and the Amazon Associate
// disclosure does not apply.
//
// A unit is asked for once its block comes within a screen of view, so an
// impression was near being seen and a prerender asks for none. Google's own
// script is the plain async one in the root layout. A unit Google has no ad
// for gives its room back, as an Amazon block with no ads does.
function useAdsenseUnit(unit: string) {
  const block = useRef<HTMLElement>(null);
  const slot = useRef<HTMLModElement>(null);
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    const element = block.current;
    const ins = slot.current;
    if (!element || !ins) return;
    const status = new MutationObserver(() => {
      if (ins.getAttribute('data-ad-status') === 'unfilled') setUnfilled(true);
    });
    status.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        // Strict mode runs this twice; asking twice for one unit is an error.
        if (ins.getAttribute('data-adsbygoogle-status')) return;
        try {
          const queue = ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []);
          queue.push({});
        } catch {}
      },
      { rootMargin: '100% 0px' },
    );
    observer.observe(element);
    return () => {
      status.disconnect();
      observer.disconnect();
    };
  }, [unit]);

  return { block, slot, unfilled };
}

function Unit({ unit, slot, className }: { unit: string; slot: React.RefObject<HTMLModElement | null>; className: string }) {
  return <ins ref={slot} className={`adsbygoogle block w-full ${className}`} data-ad-client={ADSENSE_CLIENT} data-ad-slot={unit} data-ad-format="auto" data-full-width-responsive="true" />;
}

function SponsoredHeading({ icon = false }: { icon?: boolean }) {
  const t = useT();
  return (
    <h2 className="mb-1.5 flex items-center gap-2">
      {icon ? <Icon name="cart" className="size-4 text-link" /> : null}
      <span className="text-[11px] font-semibold tracking-wider text-subtle uppercase">{t('ads.sponsored')}</span>
    </h2>
  );
}

// The timeline's side panel. `onAds` tells the column the panel is there (1) or
// not (0), so its other panels are fitted again; it is not a count of ads.
export function AdsensePanel({ unit, onAds }: { unit: string; onAds?: (count: number | null) => void }) {
  const { block, slot, unfilled } = useAdsenseUnit(unit);
  useEffect(() => {
    onAds?.(unfilled ? 0 : 1);
  }, [unfilled, onAds]);
  if (unfilled) return null;
  return (
    <section ref={block} className="floating flex shrink-0 flex-col px-3.5 pt-2.5 pb-3 text-sm">
      <SponsoredHeading icon />
      <Unit unit={unit} slot={slot} className="min-h-[250px]" />
    </section>
  );
}

// The pin page's tall space under the comments.
export function AdsenseColumn({ unit, className = '' }: { unit: string; className?: string }) {
  const { block, slot, unfilled } = useAdsenseUnit(unit);
  if (unfilled) return null;
  return (
    <section ref={block} className={`surface p-4 sm:p-5 ${className}`}>
      <SponsoredHeading />
      <Unit unit={unit} slot={slot} className="min-h-[250px]" />
    </section>
  );
}

// A banner across the foot of a pin page.
export function AdsenseBanner({ unit, className = '' }: { unit: string; className?: string }) {
  const { block, slot, unfilled } = useAdsenseUnit(unit);
  if (unfilled) return null;
  return (
    <section ref={block} className={className}>
      <SponsoredHeading />
      <Unit unit={unit} slot={slot} className="min-h-[90px]" />
    </section>
  );
}
