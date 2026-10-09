'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// The day's planet on the timeline rail. It lifts a little under the pointer;
// a click (or Enter/Space) opens a tooltip beside it naming the planet,
// weekday and moon, floating in document.body because the marker clips its
// own moon. A mouse hover opens it after the browser tooltip's wait. Another click, a click elsewhere, Escape or a scroll shuts it.
const GAP = 10;
// The wait a browser's own tooltip makes (as PillTip's).
const DELAY_MS = 750;

export function RailMarker({ today, glyph, weekday, lines, children }: { today: boolean; glyph: string; weekday: string; lines: string[]; children: ReactNode }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);

  const placeBelow = () => {
    const box = button.current!.getBoundingClientRect();
    setPlace({ top: box.bottom + GAP, left: Math.max(GAP, box.left + box.width / 2) });
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!place) return;
    const close = () => setPlace(null);
    const onDown = (event: PointerEvent) => {
      if (!button.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [place]);

  const toggle = () => {
    clearTimeout(timer.current);
    if (place || !button.current) return setPlace(null);
    placeBelow();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse') return;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => button.current && placeBelow(), DELAY_MS);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'mouse') return;
          clearTimeout(timer.current);
          setPlace(null);
        }}
        aria-expanded={!!place}
        aria-describedby={id}
        className={`rail-marker absolute top-6 start-[140px] z-10 -ms-4 hidden size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full p-0 text-base leading-none lg:flex ${today ? 'rail-marker-today' : ''}`}
      >
        {children}
        <span className="relative font-astro" aria-hidden>
          {glyph}
        </span>
        <span className="sr-only">{weekday}</span>
      </button>
      <span id={id} className="sr-only">
        {lines.join(', ')}
      </span>
      {place
        ? createPortal(
            <span
              aria-hidden
              className="rail-marker-tip pointer-events-none fixed z-50 flex -translate-x-1/2 flex-col gap-0.5 rounded-lg border border-line bg-panel px-3 py-2 text-start text-xs leading-snug font-normal text-muted shadow-lg shadow-shade/40"
              style={place}
            >
              {lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
