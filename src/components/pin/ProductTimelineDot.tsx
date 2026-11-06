'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/ui/Link';
import { CardImage } from './CardImage';

type Props = {
  href: string;
  left: number;
  major: boolean;
  first: boolean;
  title: string;
  label?: string;
  dateText: string;
  description?: string | null;
  thumbName?: string | null;
  originalUrl?: string | null;
};

const WIDTH = 288;

// One dot of a product's timeline. Hover or keyboard focus shows a card about
// the pin; a click on the dot opens the pin. The card is fixed-positioned from
// the dot's box, so the timeline's scroll area cannot clip it.
export function ProductTimelineDot({ href, left, major, first, title, label, dateText, description, thumbName, originalUrl }: Props) {
  const dot = useRef<HTMLAnchorElement>(null);
  const [hover, setHover] = useState(false);
  const [place, setPlace] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const open = hover;

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const r = dot.current?.getBoundingClientRect();
      if (!r) return;
      const x = Math.min(Math.max(r.left + r.width / 2 - WIDTH / 2, 8), window.innerWidth - WIDTH - 8);
      const below = r.top < 260;
      setPlace({ x, y: below ? r.bottom + 8 : r.top - 8, below });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open]);

  const size = major ? 'z-[1] size-3.5 bg-accent' : first ? 'size-2.5 bg-accent/80' : 'size-1.5 bg-accent/40';
  const hasPicture = !!(thumbName || originalUrl);
  return (
    <>
      <Link
        ref={dot}
        href={href}
        aria-label={`${label ? `${label}: ` : ''}${title}`}
        aria-expanded={open}
        // Hover or keyboard focus shows the card; a click opens the pin.
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && setHover(true)}
        onBlur={() => setHover(false)}
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-panel hover:z-10 hover:scale-150 focus-visible:z-10 focus-visible:scale-150 ${size}`}
        style={{ insetInlineStart: `${left}%` }}
      />
      {open && place ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 overflow-hidden rounded-xl border border-line bg-panel text-start shadow-xl"
          style={{ width: WIDTH, left: place.x, top: place.y, transform: place.below ? undefined : 'translateY(-100%)' }}
        >
          {hasPicture ? (
            <span className="relative block aspect-[16/9] bg-raised">
              <CardImage thumbName={thumbName} originalUrl={originalUrl} alt="" />
            </span>
          ) : null}
          <div className="space-y-1 p-3">
            <p className="flex flex-wrap items-center gap-2 text-xs text-subtle">
              {label ? <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">{label}</span> : null}
              <span>{dateText}</span>
            </p>
            <p className="text-sm leading-snug font-semibold text-ink">{title}</p>
            {description ? <p className="line-clamp-3 text-xs text-muted">{description}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
