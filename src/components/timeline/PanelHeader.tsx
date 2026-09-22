'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/client/i18n';

// Whether each panel was last left open, by name. The controls remount
// whenever a pick reloads the page under them (search results, a narrowed
// timeline), and a panel the viewer opened should still be open after it.
const remembered: Record<string, boolean> = {};

export function useFold(name: string, initial = false): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(() => remembered[name] ?? initial);
  return [
    open,
    (next: boolean) => {
      remembered[name] = next;
      setOpenState(next);
    },
  ];
}

// The row a floating control folds behind: what it filters on the left, what
// it is set to beside it, then a button that widens it back out when it is
// narrowed and the chevron. The whole row presses to fold and unfold, so the
// buttons on it sit above that press (pointer-events-auto) and everything
// else under it.
export function PanelHeader({
  caption,
  captionClass = 'text-subtle',
  value,
  open,
  onToggle,
  label,
  controls,
  reset,
  className = '',
  children,
}: {
  caption: string;
  // The heading's own colour, where a panel has one ("Posted within" is past-coloured).
  captionClass?: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  // What the row says to a screen reader; "Posted within: 1 day" by default.
  label?: string;
  controls: string;
  // Widens the filter back out, shown only while it narrows anything.
  reset?: { label: string; onClick: () => void };
  className?: string;
  // Anything else that belongs on the row, before the chevron.
  children?: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className={`relative flex items-center gap-2 px-3.5 py-2.5 max-lg:py-3 ${className}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={controls} aria-label={label ?? t('controls.summary', { caption, value })} className="absolute inset-0 rounded-[inherit]" />
      {/* The space is what the row reads as, copied or spoken: the gap between
          them is only a gap. */}
      <span className={`pointer-events-none relative shrink-0 ${captionClass}`}>{caption}</span>{' '}
      <span className="pointer-events-none relative min-w-0 truncate font-medium text-ink">{value}</span>
      <span className="pointer-events-none relative ml-auto flex shrink-0 items-center gap-1.5">
        {reset ? (
          <button type="button" onClick={reset.onClick} className={`${iconButton} pointer-events-auto`} aria-label={reset.label} title={reset.label}>
            <Icon name="filter-off" className="size-4" />
          </button>
        ) : null}
        {children}
        <button type="button" tabIndex={-1} aria-hidden onClick={onToggle} className={`${iconButton} pointer-events-auto`}>
          <Icon name="chevron" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </span>
    </div>
  );
}

// The round targets at the end of a panel's header row (clear, expand, fold).
export const iconButton = '-my-1 rounded-full p-1 text-subtle max-lg:p-2 hover:bg-raised hover:text-ink';
