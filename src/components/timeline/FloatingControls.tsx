'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

// The controls that float over a timeline (filters, sort, a searched user).
// On wide screens (xl) they sit top right beside the cards; narrower, they
// would cover the cards or squeeze them to one column, so they fold behind a
// button by the "Today" button.
export function FloatingControls({
  children,
  summary,
  onToday,
}: {
  children: React.ReactNode;
  // What the folded button says ("Posted within 1 day").
  summary: string;
  onToday?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <div
        id="timeline-controls"
        className={`fixed right-3 bottom-16 z-30 flex w-64 flex-col items-stretch gap-2 xl:top-[68px] xl:right-4 xl:bottom-auto xl:flex ${open ? '' : 'max-xl:hidden'}`}
      >
        {children}
      </div>
      <div className="fixed right-3 bottom-3 z-30 flex gap-2 lg:right-4 lg:bottom-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="timeline-controls"
          className="floating flex max-w-52 items-center gap-2 rounded-full px-3.5 py-2 text-sm text-ink hover:bg-raised xl:hidden"
        >
          <Icon name="sliders" className="size-4 shrink-0 text-past" />
          <span className="truncate">{summary}</span>
        </button>
        {onToday ? (
          <button type="button" onClick={onToday} className="floating flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-ink hover:bg-raised">
            <Icon name="target" className="size-4 text-warning" />
            Today
          </button>
        ) : null}
      </div>
    </div>
  );
}
