'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useScrollLock } from '@/lib/client/scrollLock';

type Fold = 'tags' | 'controls' | 'span' | null;

// Picks remount search results, so the tags fold remembers being open like
// the tag panel does.
let rememberedTagsOpen = false;

// Whether the tags fold is open (null outside floating controls): below xl the
// tag cloud has its own pill, so it shows its cloud without its own header.
const TagFoldContext = createContext<boolean | null>(null);

export function useTagFoldOpen() {
  return useContext(TagFoldContext);
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
// pill buttons by the "Today" button: the tag cloud (categories on top) and
// the window of start dates (span) behind their own, the rest behind one
// saying what they are set to.
export function FloatingControls({
  children,
  sort,
  tags,
  span,
  summary,
  summaryCaption,
  summaryIsPostedWithin = true,
  onToday,
  aside,
}: {
  children: React.ReactNode;
  // Sits above the folds, at the top of the column: sorting leads the rest.
  sort?: React.ReactNode;
  tags?: { summary: string; control: React.ReactNode };
  span?: { summary: string; control: React.ReactNode };
  // What the folded button says ("1 day"), under an optional caption ("Posted within").
  summary: string;
  summaryCaption?: string;
  // Whether that is the posted-within span (so its slider can drop its heading).
  summaryIsPostedWithin?: boolean;
  onToday?: () => void;
  // Shown under the controls on wide screens only (trending and new pins), in
  // the height they leave, and dropped when it has no room: narrower,
  // there is no room for it beside the cards.
  aside?: React.ReactNode;
}) {
  const [open, setOpenState] = useState<Fold>(() => (rememberedTagsOpen ? 'tags' : null));
  const setOpen = (next: Fold) => {
    rememberedTagsOpen = next === 'tags';
    setOpenState(next);
  };
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const shut = () => {
      rememberedTagsOpen = false;
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
  // within something that scrolls itself, like the tag cloud.
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
      <div
        className={`fixed right-3 bottom-16 left-3 z-30 flex flex-col items-stretch gap-2 lg:left-auto lg:w-64 xl:top-[68px] xl:right-4 xl:bottom-auto xl:max-h-[calc(100dvh-8.5rem)] ${
          // The full height, so the panels under the controls can share out what is left.
          aside ? 'xl:h-[calc(100dvh-8.5rem)]' : ''
        }`}
      >
        {sort}
        {tags ? (
          // Open on a phone, the cloud takes the page down to the pills, however few tags it has.
          <div id="timeline-tags" className={`flex min-h-0 flex-col ${open === 'tags' ? 'max-xl:h-[calc(100dvh-8rem)]' : 'max-xl:hidden'}`}>
            <TagFoldContext value={open === 'tags'}>{tags.control}</TagFoldContext>
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
        {/* Takes whatever height the controls leave. Whatever does not fit wraps
            into a second column, which the clipping hides; the empty first item
            lets even the first panel wrap away, since a column's first item never
            wraps. */}
        {aside ? (
          <div className="pointer-events-none flex min-h-0 grow flex-col flex-wrap overflow-clip max-xl:hidden [&>*]:w-full">
            <div aria-hidden className="h-0" />
            {aside}
          </div>
        ) : null}
      </div>
      <div className="fixed right-3 bottom-3 z-30 flex max-w-[calc(100%-1.5rem)] gap-1.5 max-sm:gap-1 lg:right-4 lg:gap-2 lg:bottom-4">
        {tags ? <FoldPill fold="tags" open={open} onToggle={toggle} icon="hash" iconClass="text-link" caption="Tags" label={tags.summary} /> : null}
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
// picked tag. On phones, where three pills share the row, its caption
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
