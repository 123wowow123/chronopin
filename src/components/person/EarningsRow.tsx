'use client';

import { useId, useState, type ReactNode } from 'react';
import { useT } from '@/lib/client/i18n';

// The year tiles of a person's earnings: one scrolling row by default, with a
// button at the top right of the heading that opens every year as a grid. The
// tiles and the heading are rendered on the server and passed in.
export function EarningsRow({ children, count, heading }: { children: ReactNode; count: number; heading: ReactNode }) {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">{heading}</div>
        <button
          type="button"
          className="shrink-0 rounded-full bg-field px-3 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t('common.showLess') : t('person.showAllYears', { count })}
        </button>
      </div>
      <ul
        id={id}
        className={
          open
            ? 'flex flex-wrap items-start gap-4 pb-2 [&>li]:w-64'
            : 'flex snap-x snap-mandatory items-start gap-4 overflow-x-auto pb-2 [&>li]:w-64 [&>li]:shrink-0 [&>li]:snap-start'
        }
      >
        {children}
      </ul>
    </div>
  );
}
