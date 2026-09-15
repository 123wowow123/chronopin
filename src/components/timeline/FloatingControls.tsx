'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

type Fold = 'category' | 'controls' | null;

// Whether the category fold is open (null outside floating controls), so a
// category filter knows to show its pills without its own header. Picks
// remount search results, so the fold remembers being open like the filter does.
const CategoryFoldContext = createContext<boolean | null>(null);
let rememberedCategoryOpen = false;

export function useCategoryFoldOpen() {
  return useContext(CategoryFoldContext);
}

// Whether a control sits in the fold behind a summary pill that, below xl,
// already says what the posted-within slider is set to.
const ControlsFoldContext = createContext(false);

export function useInControlsFold() {
  return useContext(ControlsFoldContext);
}

// The controls that float over a timeline (filters, sort, a searched user).
// On wide screens (xl) they sit top right beside the cards; narrower, they
// would cover the cards or squeeze them to one column, so they fold behind
// pill buttons by the "Today" button: the category filter behind its own,
// the rest behind one saying what they are set to.
export function FloatingControls({
  children,
  category,
  summary,
  summaryIsPostedWithin = true,
  onToday,
}: {
  children: React.ReactNode;
  category?: { summary: string; control: React.ReactNode };
  // What the folded button says ("Posted within 1 day").
  summary: string;
  // Whether that is the posted-within span (so its slider can drop its heading).
  summaryIsPostedWithin?: boolean;
  onToday?: () => void;
}) {
  const [open, setOpenState] = useState<Fold>(() => (rememberedCategoryOpen ? 'category' : null));
  const setOpen = (next: Fold) => {
    rememberedCategoryOpen = next === 'category';
    setOpenState(next);
  };
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const shut = () => {
      rememberedCategoryOpen = false;
      setOpenState(null);
    };
    const close = (event: MouseEvent) => !rootRef.current?.contains(event.target as Node) && shut();
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && shut();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  // The scroll lock in globals.css stops wheels, but a touch drag still
  // scrolls the page on mobile browsers, so drags are stopped too - except
  // within something that scrolls itself, like the category list.
  useEffect(() => {
    if (!open || !window.matchMedia('(width < 80rem)').matches) return;
    const hold = (event: TouchEvent) => {
      for (let el = event.target as Element | null; el && el !== document.body; el = el.parentElement) {
        const { overflowY } = getComputedStyle(el);
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return;
      }
      event.preventDefault();
    };
    document.addEventListener('touchmove', hold, { passive: false });
    return () => document.removeEventListener('touchmove', hold);
  }, [open]);

  // The pill whose popup is showing is tinted like a picked category.
  const pill = (expanded: boolean) =>
    `floating flex min-w-0 h-11 items-center gap-1.5 rounded-full px-3 text-sm lg:h-auto lg:gap-2 lg:px-3.5 lg:py-2 ${
      expanded ? 'bg-[color-mix(in_oklab,var(--color-accent)_18%,var(--color-panel))] text-link ring-1 ring-accent/60 ring-inset' : 'text-ink hover:bg-raised'
    }`;

  return (
    <div ref={rootRef}>
      {/* Dims the cards behind an open fold, which would otherwise blend into
          them, and (globals.css) stops the page scrolling under it. */}
      {open ? <div aria-hidden data-scroll-lock onClick={() => setOpen(null)} className="fixed inset-0 z-20 touch-none bg-black/50 xl:hidden" /> : null}
      <div className="fixed right-3 bottom-16 left-3 z-30 flex flex-col items-stretch gap-2 lg:left-auto lg:w-64 xl:top-[68px] xl:right-4 xl:bottom-auto">
        {category ? (
          <div id="timeline-category" className={`flex flex-col ${open === 'category' ? '' : 'max-xl:hidden'}`}>
            <CategoryFoldContext value={open === 'category'}>{category.control}</CategoryFoldContext>
          </div>
        ) : null}
        <div id="timeline-controls" className={`flex flex-col gap-2 ${open === 'controls' ? '' : 'max-xl:hidden'}`}>
          <ControlsFoldContext value={summaryIsPostedWithin}>{children}</ControlsFoldContext>
        </div>
      </div>
      <div className="fixed right-3 bottom-3 z-30 flex max-w-[calc(100%-1.5rem)] gap-1.5 lg:right-4 lg:gap-2 lg:bottom-4">
        {category ? (
          <button
            type="button"
            onClick={() => setOpen(open === 'category' ? null : 'category')}
            aria-expanded={open === 'category'}
            aria-controls="timeline-category"
            className={`${pill(open === 'category')} xl:hidden`}
          >
            <Icon name="tag" className="size-4 shrink-0 text-link" />
            <span className="truncate">{category.summary}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(open === 'controls' ? null : 'controls')}
          aria-expanded={open === 'controls'}
          aria-controls="timeline-controls"
          className={`${pill(open === 'controls')} max-w-52 xl:hidden`}
        >
          <Icon name="sliders" className="size-4 shrink-0 text-past" />
          <span className="truncate">{summary}</span>
        </button>
        {onToday ? (
          <button
            type="button"
            onClick={onToday}
            className="floating flex shrink-0 h-11 items-center gap-1.5 rounded-full px-3 text-sm lg:h-auto lg:gap-2 lg:px-3.5 lg:py-2 font-medium text-ink hover:bg-raised"
          >
            <Icon name="target" className="size-4 text-warning" />
            Today
          </button>
        ) : null}
      </div>
    </div>
  );
}
