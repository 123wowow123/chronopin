'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

type Fold = 'category' | 'controls' | 'span' | null;

// Whether the category fold is open (null outside floating controls), so a
// category filter knows to show its pills without its own header. Picks
// remount search results, so the fold remembers being open like the filter does.
const CategoryFoldContext = createContext<boolean | null>(null);
let rememberedCategoryOpen = false;

export function useCategoryFoldOpen() {
  return useContext(CategoryFoldContext);
}

// How many open folds are holding the page still. More than one only while a
// pick navigates away: the old page stays mounted, hidden, until the new one
// is ready, so both release their hold before the page scrolls again.
let scrollLocks = 0;

// Holds the page still behind an open fold (globals.css reads the attribute).
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    scrollLocks += 1;
    document.documentElement.dataset.scrollLock = '';
    return () => {
      scrollLocks -= 1;
      if (!scrollLocks) delete document.documentElement.dataset.scrollLock;
    };
  }, [locked]);
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
// pill buttons by the "Today" button: the category filter and the window of
// start dates (span) behind their own, the rest behind one saying what they
// are set to.
export function FloatingControls({
  children,
  sort,
  category,
  span,
  summary,
  summaryCaption,
  summaryIsPostedWithin = true,
  onToday,
}: {
  children: React.ReactNode;
  // Sits above the folds, at the top of the column: sorting leads the rest.
  sort?: React.ReactNode;
  category?: { summary: string; control: React.ReactNode };
  span?: { summary: string; control: React.ReactNode };
  // What the folded button says ("1 day"), under an optional caption ("Posted within").
  summary: string;
  summaryCaption?: string;
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

  useScrollLock(!!open);

  const toggle = (fold: Exclude<Fold, null>) => setOpen(open === fold ? null : fold);

  return (
    <div ref={rootRef}>
      {/* Dims the cards behind an open fold, which would otherwise blend into them. */}
      {open ? <div aria-hidden onClick={() => setOpen(null)} className="fixed inset-0 z-20 touch-none bg-black/50 xl:hidden" /> : null}
      <div className="fixed right-3 bottom-16 left-3 z-30 flex flex-col items-stretch gap-2 lg:left-auto lg:w-64 xl:top-[68px] xl:right-4 xl:bottom-auto">
        {sort}
        {category ? (
          <div id="timeline-category" className={`flex flex-col ${open === 'category' ? '' : 'max-xl:hidden'}`}>
            <CategoryFoldContext value={open === 'category'}>{category.control}</CategoryFoldContext>
          </div>
        ) : null}
        {/* Scrolls when taller than the room under the navbar (a searched user's card too). */}
        <div
          id="timeline-controls"
          className={`flex flex-col gap-2 max-xl:max-h-[calc(100dvh-8rem)] max-xl:overflow-y-auto max-xl:overscroll-contain ${open === 'controls' ? '' : 'max-xl:hidden'}`}
        >
          <ControlsFoldContext value={summaryIsPostedWithin}>{children}</ControlsFoldContext>
        </div>
        {span ? (
          <div id="timeline-span" className={`flex flex-col ${open === 'span' ? '' : 'max-xl:hidden'}`}>
            {span.control}
          </div>
        ) : null}
      </div>
      <div className="fixed right-3 bottom-3 z-30 flex max-w-[calc(100%-1.5rem)] gap-1.5 max-sm:gap-1 lg:right-4 lg:gap-2 lg:bottom-4">
        {category ? <FoldPill fold="category" open={open} onToggle={toggle} icon="tag" iconClass="text-link" caption="Category" label={category.summary} /> : null}
        <FoldPill fold="controls" open={open} onToggle={toggle} icon="sliders" iconClass="text-past" caption={summaryCaption} label={summary} className="max-w-52" />
        {span ? <FoldPill fold="span" open={open} onToggle={toggle} icon="timeline" iconClass="text-future" caption="Time span" label={span.summary} /> : null}
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

// A pill that opens one fold; the one whose popup is showing is tinted like a
// picked category. On phones, where three pills share the row, its caption
// sits small over the value rather than beside it, so neither is cut short.
function FoldPill({
  fold,
  open,
  onToggle,
  icon,
  iconClass,
  caption,
  label,
  className = '',
}: {
  fold: Exclude<Fold, null>;
  open: Fold;
  onToggle: (fold: Exclude<Fold, null>) => void;
  icon: IconName;
  iconClass: string;
  caption?: string;
  label: string;
  className?: string;
}) {
  const expanded = open === fold;
  return (
    <button
      type="button"
      onClick={() => onToggle(fold)}
      aria-expanded={expanded}
      aria-controls={`timeline-${fold}`}
      className={`floating flex min-w-0 h-11 items-center gap-1.5 rounded-full px-3 text-sm max-sm:gap-1 max-sm:px-2 lg:h-auto lg:gap-2 lg:px-3.5 lg:py-2 xl:hidden ${className} ${
        expanded ? 'bg-[color-mix(in_oklab,var(--color-accent)_18%,var(--color-panel))] text-link ring-1 ring-accent/60 ring-inset' : 'text-ink hover:bg-raised'
      }`}
    >
      <Icon name={icon} className={`size-4 shrink-0 ${iconClass}`} />
      <span className="flex min-w-0 flex-col text-left leading-tight sm:flex-row sm:gap-1 sm:leading-normal">
        {caption ? <span className="truncate text-[11px] text-subtle sm:text-sm sm:text-current">{caption}</span> : null}
        <span className="truncate">{label}</span>
      </span>
    </button>
  );
}
