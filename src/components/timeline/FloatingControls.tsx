'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { registerControls, useControlsSlot, useOwnsControls } from '@/lib/client/controlsDrawer';
import { useScrollLock } from '@/lib/client/scrollLock';
import { useT } from '@/lib/client/i18n';
import { PanelHeader, useFold } from './PanelHeader';

type Fold = 'tags' | 'controls' | 'span' | null;

// Picks remount search results, so the tags fold remembers being open like
// the tag panel does.
let rememberedTagsOpen = false;

// Whether the tags fold is open (null outside floating controls): between lg
// and xl the tag cloud has its own pill, so it shows its cloud without its
// own header.
const TagFoldContext = createContext<boolean | null>(null);

export function useTagFoldOpen() {
  return useContext(TagFoldContext);
}

// Whether a control sits in the fold behind a summary pill that, between lg
// and xl, already says what the posted-within slider is set to.
const ControlsFoldContext = createContext(false);

export function useInControlsFold() {
  return useContext(ControlsFoldContext);
}

// Whether a control is riding in the nav drawer rather than floating over the
// cards. There it is a panel among the drawer's rows, headed and folded like
// the ones in the xl column, and sized for that column's width.
const DrawerPanelContext = createContext(false);

export function useInDrawerPanel() {
  return useContext(DrawerPanelContext);
}

// Whether a control is a section of the one "Filters" panel the xl column
// folds its filters behind (null when there is no such panel), and whether
// that panel is open. A section there has no fold of its own: the panel is
// the fold, so the section is either wholly shown or put away with the rest.
const MergedPanelContext = createContext<boolean | null>(null);

export function useMergedPanel() {
  return useContext(MergedPanelContext);
}

// Whether the sliders offer a typed box and preset chips under the track (the
// admin setting, src/lib/sliderTyping.ts); off, a slider is its track alone.
const SliderTypingContext = createContext(false);

export function useSliderTyping() {
  return useContext(SliderTypingContext);
}

// A section's own panel chrome, dropped from xl up inside the merged panel.
export const mergedSection = 'xl:rounded-none xl:border-0 xl:bg-transparent xl:shadow-none';

// Where the drawer's own button is (src/components/nav/MobileDrawer.tsx): on
// anything narrower there is a drawer to put the controls in, and no pills.
const DRAWER_WIDTH = '(width < 64rem)';

function subscribeWidth(listener: () => void) {
  const query = window.matchMedia(DRAWER_WIDTH);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

// The server cannot know the screen, so it writes the floating column, which
// is hidden below lg either way; the drawer is only filled once hydrated.
function useDrawerWidth() {
  return useSyncExternalStore(
    subscribeWidth,
    () => window.matchMedia(DRAWER_WIDTH).matches,
    () => false,
  );
}

// The controls that float over a timeline (filters, sort, a searched user).
// On wide screens (xl) they sit top right beside the cards. Between lg and xl
// they would cover the cards or squeeze them to one column, so they fold
// behind pill buttons by the "Today" button: the tag cloud (categories on
// top) and the window of start dates (span) behind their own, the rest behind
// one saying what they are set to. Below lg - a phone, where those pills ate
// the foot of the screen - they ride in the nav drawer instead, under
// "Filters", as the panels they are in the xl column; only "Today" is left
// floating over the cards.
export function FloatingControls({
  children,
  sort,
  tags,
  span,
  summary,
  summaryCaption,
  summaryIsPostedWithin = true,
  onToday,
  bottom,
  aside,
  merge = false,
  filterSummary,
  cards,
  typing = false,
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
  // Below lg only, at the foot of the screen on the left, opposite "Today": a
  // control that must stay to hand while the rest are shut away in the drawer
  // (the search page's sort). Wider, the pills are already down there and it
  // has a place of its own on the page.
  bottom?: React.ReactNode;
  // Shown under the controls on wide screens only (trending and new pins), in
  // the height they leave, and dropped when it has no room: narrower,
  // there is no room for it beside the cards.
  aside?: React.ReactNode;
  // From xl up, folds the tags and every control in children behind one
  // "Filters" row rather than a row each.
  merge?: boolean;
  // What that row says the posted-within filter is set to, when summary says
  // something else (the search page's searched user); summary by default.
  filterSummary?: string;
  // What is not a filter but rides with them (the search page's searched user
  // and company): under the merged panel from xl up, never inside it, and in
  // the controls' fold or the drawer narrower, after the filters.
  cards?: React.ReactNode;
  // The admin setting: whether the sliders offer a typed box.
  typing?: boolean;
}) {
  const [open, setOpenState] = useState<Fold>(() => (rememberedTagsOpen ? 'tags' : null));
  const setOpen = (next: Fold) => {
    rememberedTagsOpen = next === 'tags';
    setOpenState(next);
  };
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const inDrawer = useDrawerWidth();
  const slot = useControlsSlot();
  // These controls' claim on the drawer's Filters section. Made from an
  // effect, so the pages React keeps mounted but hidden either side of this
  // one - each with controls of its own - do not fill the drawer as well.
  const [claim] = useState(() => ({}));
  useEffect(() => registerControls(claim), [claim]);
  const owns = useOwnsControls(claim);
  const [mergedOpen, setMergedOpen] = useFold('filters');
  const mergedId = useId();
  // What the merged row says: only the filters that narrow anything, each as
  // its own pill says it, or "All" when none do.
  const all = t('common.all');
  const narrowing = [tags?.summary, filterSummary ?? summary, span?.summary]
    .flatMap((part) => (part ? part.split(' · ') : []))
    .filter((part) => part && part !== all);
  const mergedSummary = narrowing.length ? narrowing.join(' · ') : all;

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

  useScrollLock(!!open);

  const toggle = (fold: Exclude<Fold, null>) => setOpen(open === fold ? null : fold);

  // In the drawer the panels are stacked, behind one "Filters" row when
  // merged: the drawer scrolls, and its own close puts the lot away, so there
  // is nothing for the pills or the dimmer to do.
  //
  // The tag cloud only rides along in the merged panel. It is a cloud of sixty
  // tags, a wall of words on a phone; folded behind "Filters" it is out of the
  // way until asked for, where loose it pushed the sliders off the screen.
  if (inDrawer) {
    return (
      <>
        {owns && slot
          ? createPortal(
              <DrawerPanelContext value={true}>
                <SliderTypingContext value={typing}>
                  <div className="flex flex-col gap-2">
                    {merge ? (
                      // One panel, as in the xl column: the "Filters" row,
                      // then each slider under it, wholly open, stripped of
                      // its own panel. No box of its own either: the drawer's
                      // rules above and below already frame it, and a box
                      // inside them reads as a double border.
                      <div className="flex flex-col text-sm">
                        <PanelHeader
                          caption={t('controls.filters')}
                          captionClass="font-semibold text-ink"
                          icon="sliders"
                          value={mergedSummary}
                          open={mergedOpen}
                          onToggle={() => setMergedOpen(!mergedOpen)}
                          controls={mergedId}
                        />
                        <div
                          id={mergedId}
                          className={`flex-col [&>*]:rounded-none [&>*]:border-x-0 [&>*]:border-t-0 [&>*]:border-line [&>*]:bg-transparent [&>*]:shadow-none [&>*:last-child]:border-b-0 ${
                            mergedOpen ? 'flex' : 'hidden'
                          }`}
                        >
                          <MergedPanelContext value={mergedOpen}>
                            {tags?.control}
                            {children}
                            {span?.control}
                          </MergedPanelContext>
                        </div>
                      </div>
                    ) : (
                      <>
                        {children}
                        {span?.control}
                      </>
                    )}
                    {cards}
                  </div>
                </SliderTypingContext>
              </DrawerPanelContext>,
              slot,
            )
          : null}
        {/* Its own corner rather than a place in the row on the right: the
            reader's thumb reaches the near side of a phone, and "Today"
            keeps the corner it has everywhere else. */}
        {bottom ? <div className="fixed bottom-3 left-3 z-30 flex max-w-[calc(100%-1.5rem)]">{bottom}</div> : null}
        <TodayBar onToday={onToday} />
      </>
    );
  }

  return (
    <SliderTypingContext value={typing}>
      <div ref={rootRef}>
        {/* Dims the cards behind an open fold, which would otherwise blend into them. */}
        {open ? <div aria-hidden onClick={() => setOpen(null)} className="fixed inset-0 z-20 touch-none bg-black/50 xl:hidden" /> : null}
        <div
          className={`fixed right-3 bottom-16 z-30 flex w-64 flex-col items-stretch gap-2 xl:top-[68px] xl:right-4 xl:bottom-auto xl:max-h-[calc(100dvh-8.5rem)] ${
            // The full height, so the panels under the controls can share out what is left.
            aside ? 'xl:h-[calc(100dvh-8.5rem)]' : ''
          }`}
        >
          {sort}
          {/* From xl up with merge, one panel: the "Filters" row, then every
              section under it while it is open. Narrower the wrappers are
              display: contents, so each section is its fold's popup as before. */}
          <div
            className={
              merge
                ? 'contents xl:flex xl:min-h-0 xl:flex-col xl:rounded-xl xl:border xl:border-tint/[0.07] xl:bg-panel xl:text-sm xl:shadow-2xl xl:shadow-shade/50'
                : 'contents'
            }
          >
            {merge ? (
              <PanelHeader
                caption={t('controls.filters')}
                captionClass="font-semibold text-ink"
                icon="sliders"
                value={mergedSummary}
                open={mergedOpen}
                onToggle={() => setMergedOpen(!mergedOpen)}
                controls={mergedId}
                className="max-xl:hidden"
              />
            ) : null}
            <div
              id={mergedId}
              className={
                merge
                  ? `contents ${mergedOpen ? 'xl:flex xl:min-h-0 xl:flex-col xl:divide-y xl:divide-line xl:border-t xl:border-line xl:overflow-y-auto xl:overscroll-contain xl:[&>*]:shrink-0' : 'xl:hidden'}`
                  : 'contents'
              }
            >
              <MergedPanelContext value={merge ? mergedOpen : null}>
                {tags ? (
                  // Open behind its pill, the cloud takes the page down to it, however few tags it has.
                  <div id="timeline-tags" className={`flex min-h-0 flex-col ${open === 'tags' ? 'max-xl:h-[calc(100dvh-8rem)]' : 'max-xl:hidden'}`}>
                    <TagFoldContext value={open === 'tags'}>{tags.control}</TagFoldContext>
                  </div>
                ) : null}
                {/* Scrolls when taller than the room under the navbar (a searched user's card too). */}
                <div
                  id="timeline-controls"
                  className={`flex flex-col gap-2 max-xl:max-h-[calc(100dvh-8rem)] max-xl:overflow-y-auto max-xl:overscroll-contain ${merge ? 'xl:gap-0 xl:divide-y xl:divide-line' : ''} ${
                    open === 'controls' ? '' : 'max-xl:hidden'
                  }`}
                >
                  <ControlsFoldContext value={summaryIsPostedWithin}>{children}</ControlsFoldContext>
                </div>
                {span ? (
                  <div id="timeline-span" className={`flex flex-col ${open === 'span' ? '' : 'max-xl:hidden'}`}>
                    {span.control}
                  </div>
                ) : null}
              </MergedPanelContext>
            </div>
          </div>
          {cards ? <div className={`flex flex-col gap-2 ${open === 'controls' ? '' : 'max-xl:hidden'}`}>{cards}</div> : null}
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
        <TodayBar onToday={onToday}>
          {tags ? <FoldPill fold="tags" open={open} onToggle={toggle} icon="hash" iconClass="text-tags" caption={t('controls.tags')} label={tags.summary} /> : null}
          <FoldPill fold="controls" open={open} onToggle={toggle} icon="sliders" iconClass="text-past" caption={summaryCaption} label={summary} className="max-w-52" />
          {span ? <FoldPill fold="span" open={open} onToggle={toggle} icon="timeline" iconClass="text-future" caption={t('controls.timeSpan')} label={span.summary} /> : null}
        </TodayBar>
      </div>
    </SliderTypingContext>
  );
}

// The row at the foot of the cards: the fold pills, where there are any, and
// "Today", which stays there however the filters are reached.
function TodayBar({ onToday, children }: { onToday?: () => void; children?: React.ReactNode }) {
  const t = useT();
  if (!onToday && !children) return null;
  return (
    <div className="fixed right-3 bottom-3 z-30 flex max-w-[calc(100%-1.5rem)] gap-1.5 max-sm:gap-1 lg:right-4 lg:gap-2 lg:bottom-4">
      {children}
      {onToday ? (
        <button
          type="button"
          onClick={onToday}
          className="floating flex shrink-0 h-11 items-center gap-1.5 rounded-full px-3 text-sm lg:h-auto lg:gap-2 lg:px-3.5 lg:py-2 font-medium text-ink hover:bg-raised"
        >
          <Icon name="target" className="size-4 text-warning" />
          {t('controls.today')}
        </button>
      ) : null}
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
      className={`floating flex min-w-0 h-11 items-center gap-1.5 rounded-full px-3 text-sm max-sm:gap-1 max-sm:px-2 max-lg:hidden lg:h-auto lg:gap-2 lg:px-3.5 lg:py-2 xl:hidden ${className} ${
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
