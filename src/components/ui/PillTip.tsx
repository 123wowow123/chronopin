'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// A tooltip saying what a pill in a card's row of badges describes. It shows
// on a mouse hover or keyboard focus after a short wait, floating over the page
// (fixed, in document.body) so the card's overflow-hidden cannot clip it:
// under the pill, or over it near the foot of the window, kept inside the
// window's sides. A scroll shuts it rather than leaving it behind. The same
// words sit in a visually hidden span for the pill's aria-describedby, so the
// floating copy is hidden from screen readers. A touch goes straight to the
// pill's link, as before.
const DELAY_MS = 750;
const WIDTH = 288;
const ROOM_BELOW = 160;
const GAP = 8;

type Place = { top?: number; bottom?: number; left: number; width: number };

function placeFor(box: DOMRect): Place {
  const width = Math.min(WIDTH, window.innerWidth - 2 * GAP);
  const left = Math.min(Math.max(GAP, box.left), window.innerWidth - width - GAP);
  return window.innerHeight - box.bottom < ROOM_BELOW
    ? { bottom: window.innerHeight - box.top + GAP, left, width }
    : { top: box.bottom + GAP, left, width };
}

export function PillTip({ tip, children }: { tip: ReactNode; children: (describedBy: string) => ReactNode }) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [place, setPlace] = useState<Place | null>(null);

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (anchor.current) setPlace(placeFor(anchor.current.getBoundingClientRect()));
    }, DELAY_MS);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setPlace(null);
  };

  useEffect(() => {
    if (!place) return;
    const close = () => setPlace(null);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [place]);

  // The page may hide (not unmount) this card, so a pending show must not fire later.
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span
      ref={anchor}
      className="inline-flex"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') show();
      }}
      onPointerLeave={hide}
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) show();
      }}
      onBlur={hide}
      onClick={hide}
    >
      {children(id)}
      <span id={id} className="sr-only">
        {tip}
      </span>
      {place
        ? createPortal(
            <span
              aria-hidden
              className="pointer-events-none fixed z-50 flex flex-col gap-1 rounded-lg border border-line bg-panel px-3 py-2 text-start text-xs leading-snug font-normal tracking-normal text-muted normal-case not-italic shadow-lg shadow-shade/40"
              style={place}
            >
              {tip}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
