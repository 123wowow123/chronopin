'use client';

import { useRouter } from '@/lib/client/navigation';
import { splitLocale, type Locale } from '@/lib/i18n/config';
import { Fragment, useCallback, useEffect, useId, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { hrefKeepingDate } from '@/lib/client/returnSpot';
import { useScrollLock } from '@/lib/client/scrollLock';
import { refineQuery, removeTerm } from '@/lib/searchTerms';
import { cloudSteps, cloudTags, groupSelection, groupTags, isReserved, reservedPicked, reservedTag, reservedValues, RESERVED_TAGS, tagMembers, type TagCount, type TagGroup } from '@/lib/tags';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { holdDrawerForPick, leaveDrawerForCloud, onOpenTagCloud, returnToDrawer } from '@/lib/client/controlsDrawer';
import { mergedSection, useInDrawerPanel, useMergedPanel, useTagFoldOpen, useTagList } from './FloatingControls';
import { iconButton, PanelHeader } from './PanelHeader';
import { WordCloud } from './WordCloud';
import { useT } from '@/lib/client/i18n';
import { FORMAT_WORDS } from '@/lib/i18n/formatWords';
import { tagLabel } from '@/lib/i18n/labels';
import type { MessageKey } from '@/lib/i18n/translate';

// Whether the panel was last left open. Search results remount with each
// query, so without this every pick would fold the panel away. The last
// counts fetched show while a remounted panel fetches its own, so the cloud
// does not blink out and back after each pick.
let rememberedOpen = false;
// Likewise the big cloud, so picks made in it do not close it.
let rememberedExpanded = false;
let rememberedCounts: TagCount[] | null = null;
// And the big cloud's, which reads more tags than the panel: a pick in it is
// a new page with a new cloud, which would otherwise start at "Loading" and
// flash before redrawing.
let rememberedViewCounts: TagCount[] | null = null;
// Grouped (tags wrapped up into their larger category) or every tag on its
// own, shared by the panel and the big cloud.
let rememberedWrapped = true;

// How many tags the cloud shows before its filter box is needed.
const SHOWN = 60;
// A step up from what the cards use: the cloud is read at a glance, and its
// smallest tags were too small to pick out. Another step up between lg and
// xl, where the cloud has the screen to itself behind its pill rather than a
// 16rem column, and is read at arm's length.
// A tag left out of the search (-tag:): struck through in the danger colour.
const EXCLUDED_CLASS = 'bg-red-500/10 text-danger line-through ring-1 ring-red-500/40 ring-inset';

const STEP_CLASS = [
  '',
  'text-base xl:text-sm',
  'text-[17px] xl:text-[15px]',
  'text-lg xl:text-base',
  'text-xl xl:text-lg',
  'text-2xl xl:text-xl font-semibold',
];
// What is picked, in brief ("Artemis", "Artemis +2"), or 'All' for nothing.
function tagSummary(selected: string[], locale: Locale = 'en') {
  return !selected.length ? FORMAT_WORDS[locale].all : selected.length === 1 ? selected[0] : `${selected[0]} +${selected.length - 1}`;
}

// The value on the floating controls' tags pill (under "Tags"): what the
// cloud has picked, the site's own filters among the tags.
export function tagPillSummary(query?: string, locale: Locale = 'en') {
  const picked = parseSearchQuery(query);
  return tagSummary([...reservedPicked(picked), ...picked.tags.filter((name) => !isReserved(name))], locale);
}

// The tag filter in the floating controls, the first of them, with the
// pins' categories at the top of its grouped mode: a row saying what is picked that unfolds, in place, into a
// cloud of the tags of the pins showing - the timeline's, or the search's
// results with its tag: terms left out - sized by how many pins carry each.
// Unfolded, it takes height from the panels under it (trending, new pins),
// which drop out when there is no room. A tag toggles its tag: term in the
// search query, so it shows and is edited in the navbar's search box; off the
// search page a pick starts a search - unless the page takes the query
// itself (the map does, staying where it is).
//
// Only where there is room to read it: the xl column, or its own pill
// between lg and xl. Below lg the other filters ride in the nav drawer and
// this one does not (FloatingControls).
export function TagCloud({
  query,
  onlyWatched = false,
  postedWithin = null,
  createdSince = null,
  onQuery,
  className = '',
}: {
  query?: string;
  onlyWatched?: boolean;
  postedWithin?: string | null;
  createdSince?: string | null;
  // Where a pick goes when it is not a search of its own: the page is handed
  // the edit to make to the query it already shows (the map filters its
  // markers by it rather than leaving for the results).
  onQuery?: (edit: (query: string) => string) => void;
  className?: string;
}) {
  const router = useRouter();
  const t = useT();
  // In the floating controls' tags fold (between lg and xl, behind its own
  // pill): the pill is the header, and the cloud shows while the fold is open.
  const folded = useTagFoldOpen();
  const inFold = folded !== null;
  // A section of the xl column's one "Filters" panel: open whenever it is.
  const mergedOpen = useMergedPanel();
  const merged = mergedOpen !== null;
  const inDrawer = useInDrawerPanel();
  // Whether the panel lists its tags (an admin setting, src/lib/tagList.ts).
  // Off, its row is the big cloud's button and nothing folds out.
  const listed = useTagList();
  // Unique, since Next keeps the previous page's panel mounted (hidden).
  const optionsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpenState] = useState(() => rememberedOpen);
  const setOpen = (next: boolean) => {
    rememberedOpen = next;
    setOpenState(next);
  };
  const [counts, setCounts] = useState<TagCount[] | null>(() => rememberedCounts);
  const [filter, setFilter] = useState('');
  // Groups unfolded to show the tags they wrap.
  const [unfolded, setUnfolded] = useState<Set<string>>(() => new Set());
  // The big cloud over the page (TagCloudView), which reads more tags.
  const [expanded, setExpandedState] = useState(() => rememberedExpanded);
  const setExpanded = (next: boolean) => {
    rememberedExpanded = next;
    setExpandedState(next);
  };
  const [wrapped, setWrappedState] = useState(() => rememberedWrapped);
  const setWrapped = (next: boolean) => {
    rememberedWrapped = next;
    setWrappedState(next);
  };
  const [searching, startSearch] = useTransition();
  const parsed = useMemo(() => parseSearchQuery(query), [query]);
  // What is picked, the tags and the site's own filters apart: only the tags
  // are sized, grouped and counted against the cloud's limit, and a site
  // filter writes a term of its own (confidence:) rather than a tag: term.
  const picked = useMemo(() => parsed.tags.filter((name) => !isReserved(name)), [parsed]);
  const pickedFilters = useMemo(() => reservedPicked(parsed), [parsed]);
  // Tags left out (-tag:): a second click on a picked tag, a third drops it.
  const pickedOut = useMemo(() => parsed.excludeTags, [parsed]);
  const [selected, setSelected] = useOptimistic(picked);
  const [reserved, setReserved] = useOptimistic(pickedFilters);
  const [excluded, setExcluded] = useOptimistic(pickedOut);

  const params = new URLSearchParams();
  if (query != null) params.set('q', query);
  if (query != null && onlyWatched) params.set('f', 'watch');
  if (createdSince) params.set('created_since', createdSince);
  else if (postedWithin) params.set('created_within', postedWithin);
  const countsUrl = `/api/pins/tag-counts?${params.toString()}`;

  const showing = listed && (open || !!folded || !!mergedOpen);
  useEffect(() => {
    if (!showing) return;
    let cancelled = false;
    api.get<TagCount[]>(countsUrl).then(
      (next) => {
        if (cancelled) return;
        rememberedCounts = next;
        setCounts(next);
      },
      () => !cancelled && setCounts(null),
    );
    return () => {
      cancelled = true;
    };
  }, [showing, countsUrl]);

  // Clicking (or Escape) anywhere but the panel folds it away, as the
  // other panels do. On the click rather than the press, and not for a
  // target its own handler already took off the page (the pill's own toggle).
  // Not while the big cloud is up: it has its own Escape and its own outside.
  useEffect(() => {
    if (!open || expanded) return;
    const shut = () => {
      rememberedOpen = false;
      setOpenState(false);
    };
    const close = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && document.contains(target) && !rootRef.current?.contains(target)) shut();
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && shut();
    document.addEventListener('click', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open, expanded]);

  const needle = filter.trim().toLowerCase();
  // The site's own filters lead the cloud in a strip of their own; the rest
  // of the counts are the tags people wrote.
  const written = useMemo(() => (counts ?? []).filter((t) => t.kind !== 'reserved'), [counts]);
  // Tags wrap up into their larger category (an award body's years, the
  // market exchanges); finding a tag looks through the wrapped ones too.
  const groups = useMemo(() => (wrapped ? groupTags(written) : []), [written, wrapped]);
  const isSelected = (name: string) => selected.some((s) => s.toLowerCase() === name.toLowerCase());
  const isExcluded = (name: string) => excluded.some((s) => s.toLowerCase() === name.toLowerCase());
  // Picked or left out, a tag stays in the list, so it can be changed back.
  const marked = useMemo(() => [...selected, ...excluded], [selected, excluded]);
  const tags = useMemo<TagGroup[]>(() => {
    if (needle) return cloudTags(written.filter((t) => t.name.toLowerCase().includes(needle)), [], SHOWN);
    if (!wrapped) return cloudTags(written, marked, SHOWN);
    // Picked tags outside any shown group stay listed on their own.
    return cloudTags(groups, groupSelection(groups, marked), SHOWN);
  }, [written, groups, marked, needle, wrapped]);
  const steps = useMemo(() => cloudSteps(tags), [tags]);
  const summary = tagSummary([...reserved, ...selected, ...excluded.map((name) => `−${name}`)], t.locale);

  function go(edit: (q: string) => string, next: string[], nextReserved: string[] = reserved, nextExcluded: string[] = excluded) {
    if (onQuery) {
      startSearch(() => {
        setSelected(next);
        setReserved(nextReserved);
        setExcluded(nextExcluded);
        onQuery(edit);
      });
      return;
    }
    const current = new URLSearchParams(splitLocale(window.location.pathname).path === '/search' ? window.location.search : '');
    const q = edit(current.get('q') || '');
    if (q) current.set('q', q);
    else current.delete('q');
    // Nothing left to search for or filter by: that's the timeline.
    const href = current.size ? `/search?${current.toString()}` : '/';
    // Fewer tags picked is a wider search, which stays on the same date.
    const widened = next.length + nextReserved.length + nextExcluded.length < selected.length + reserved.length + excluded.length;
    // A pick in the drawer's list keeps the drawer open and where it was
    // scrolled, through the change of page it makes.
    if (inDrawer) holdDrawerForPick();
    startSearch(() => {
      setSelected(next);
      setReserved(nextReserved);
      setExcluded(nextExcluded);
      router.push(widened ? hrefKeepingDate(href) : href);
    });
  }

  const unfold = (name: string) =>
    setUnfolded((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  // A tag's term, taken out or put in. category: is the old name for a
  // category's tag (0043) and a query may still hold one, so both spellings
  // come out, each either way round; what goes back in is always tag: or -tag:.
  const withoutTag = (query: string, name: string) =>
    (['category', 'tag', '-category', '-tag'] as const).reduce((q, field) => removeTerm(q, field, name), query);
  const others = (list: string[], name: string) => list.filter((s) => s.toLowerCase() !== name.toLowerCase());
  // Each click moves a tag on a step: off, then picked (tag:), then left out
  // (-tag:), then off again.
  const toggle = (name: string) => {
    if (isSelected(name)) {
      go((q) => refineQuery(withoutTag(q, name), '-tag', name), others(selected, name), reserved, [...others(excluded, name), name]);
    } else if (isExcluded(name)) {
      go((q) => withoutTag(q, name), selected, reserved, others(excluded, name));
    } else {
      go((q) => refineQuery(withoutTag(q, name), 'tag', name), [...selected, name], reserved, others(excluded, name));
    }
  };

  // A site filter's own term, put in or taken out. Taken out in every
  // spelling the search reads it by (confidence:unverified is the stored
  // confidence:unknown), so one typed by hand comes out too.
  const withoutReserved = (query: string, name: string) => {
    const site = reservedTag(name);
    return site ? reservedValues(site).reduce((q, value) => removeTerm(q, site.field, value), query) : query;
  };
  const toggleReserved = (name: string) => {
    const site = reservedTag(name);
    if (!site) return;
    const on = reserved.some((r) => r.toLowerCase() === name.toLowerCase());
    go(
      (q) => (on ? withoutReserved(q, name) : refineQuery(withoutReserved(q, name), site.field, site.value)),
      selected,
      on ? reserved.filter((r) => r.toLowerCase() !== name.toLowerCase()) : [...reserved, name],
    );
  };
  const clear = () => go((q) => reserved.reduce(withoutReserved, [...selected, ...excluded].reduce(withoutTag, q)), [], [], []);

  const openCloud = () => {
    // From the drawer, the cloud would open under it; closing it goes back.
    if (inDrawer) leaveDrawerForCloud();
    setExpanded(true);
  };
  const closeCloud = () => {
    setExpanded(false);
    if (inDrawer) returnToDrawer();
  };
  // The tags pill between lg and xl, when there is no list for it to fold out.
  useEffect(() => (listed ? undefined : onOpenTagCloud(openCloud)));

  return (
    <div ref={rootRef} className={`floating flex min-h-0 flex-col text-sm ${inFold ? 'max-xl:h-full' : ''} ${merged ? mergedSection : ''} ${className}`}>
      {/* The same row the sliders under it fold behind, with the big cloud's
          button on it as well. */}
      <PanelHeader
        caption={t('controls.tags')}
        captionClass="font-semibold text-tags"
        value={summary}
        open={listed && open}
        onToggle={listed ? () => setOpen(!open) : openCloud}
        opensDialog={!listed}
        label={t('tagCloud.tagsSummary', { summary })}
        controls={optionsId}
        reset={selected.length || reserved.length || excluded.length ? { label: t('tagCloud.clear'), onClick: clear } : undefined}
        className={inFold ? 'max-xl:hidden' : ''}
        fixed={merged && listed}
      >
        {/* With no list, the row itself opens the cloud, and its chevron says so. */}
        {listed ? (
          <button
            type="button"
            onClick={openCloud}
            className={`${iconButton} pointer-events-auto`}
            aria-label={t('tagCloud.expand')}
            title={t('tagCloud.expand')}
            aria-haspopup="dialog"
          >
            <Icon name="expand" className="size-4" />
          </button>
        ) : null}
      </PanelHeader>
      {showing ? (
        // In the fold the cloud is the fold's; elsewhere the header row opens it.
        <div id={optionsId} className={`flex min-h-0 flex-col ${inFold ? 'max-xl:flex-1 max-xl:pt-3' : ''} ${inFold && !open && !merged ? 'xl:hidden' : ''}`}>
          <div className="flex items-center gap-2 px-3 pb-2">
            <FindTag value={filter} onChange={setFilter} className="min-w-0 flex-1" />
            <GroupedToggle wrapped={wrapped} onChange={setWrapped} />
          </div>
          {/* The site's filters lead the cloud inside its scroll rather than
              standing over it: in a column this narrow, a strip that stayed
              put would take the height the tags are read in. In the merged
              "Filters" panel there is no scroll of its own: the panel's one
              scroll carries the cloud with the sliders under it. */}
          <div
            className={`px-3.5 pb-3 ${
              merged && inDrawer
                ? ''
                : `max-h-[min(22rem,50dvh)] overflow-y-auto overscroll-contain ${merged ? 'xl:max-h-none xl:overflow-y-visible' : ''}`
            } ${inFold ? 'max-xl:max-h-none max-xl:flex-1' : ''}`}
          >
            <ReservedFilters counts={counts ?? []} selected={reserved} needle={needle} onToggle={toggleReserved} className="pb-2.5" />
            <div
              role="group"
              aria-label={t('tagCloud.filterBy')}
              aria-busy={searching || undefined}
              className="flex flex-wrap content-start items-baseline gap-x-2.5 gap-y-1.5"
            >
              {tags.map((tag) => {
                const members = tag.members;
                const pressed = isSelected(tag.name);
                const out = isExcluded(tag.name);
                const partly = !pressed && !out && tagMembers(tag).some((m) => isSelected(m.name) || isExcluded(m.name));
                const open = !!members && (unfolded.has(tag.name) || partly);
                return (
                  <Fragment key={tag.name}>
                    <span className="inline-flex items-baseline">
                      <button
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => toggle(tag.name)}
                        title={`${tagLabel(t, tag)}: ${t('tagCloud.pins', { count: tag.count })}${members ? `, ${t('tagCloud.tags', { count: members.length })}` : ''} · ${
                          pressed ? t('tagCloud.clickToExclude') : out ? t('tagCloud.clickToDrop') : t('tagCloud.clickToAdd')
                        }`}
                        className={`${STEP_CLASS[steps.get(tag.name.toLowerCase()) ?? 1]} rounded-md px-1 text-left leading-snug transition-colors ${
                          pressed
                            ? 'bg-accent/15 text-link ring-1 ring-accent/60 ring-inset'
                            : out
                              ? EXCLUDED_CLASS
                              : tag.kind === 'award' || tag.kind === 'nomination' || tag.kind === 'category'
                              ? 'text-ink hover:text-link'
                              : 'text-muted hover:text-ink'
                        } ${tag.count === 0 && !pressed && !out ? 'opacity-50' : ''}`}
                      >
                        {tagLabel(t, tag)}
                        {out ? <span className="sr-only"> ({t('tagCloud.leftOut')})</span> : null}
                        <span className="ml-1 text-sm font-normal text-subtle tabular-nums xl:text-xs">
                          {tag.count}
                          <span className="sr-only"> {t('tagCloud.pinsWord', { count: tag.count })}</span>
                        </span>
                      </button>
                      {members ? (
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={t(open ? 'tagCloud.hideMembers' : 'tagCloud.showMembers', { count: members.length, name: tagLabel(t, tag) })}
                          title={t('tagCloud.tagsInside', { count: members.length })}
                          onClick={() => unfold(tag.name)}
                          className="ml-0.5 rounded px-0.5 text-[11px] text-subtle hover:text-ink"
                        >
                          <Icon name="chevron" className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                      ) : null}
                    </span>
                    {open ? <Members members={members!} isSelected={isSelected} isExcluded={isExcluded} onToggle={toggle} unfolded={unfolded} onUnfold={unfold} /> : null}
                  </Fragment>
                );
              })}
              {!counts ? (
                <p role="status" className="py-1 text-xs text-subtle">
                  {t('tagCloud.loading')}
                </p>
              ) : !tags.length ? (
                <p className="py-1 text-xs text-subtle">{needle ? t('tagCloud.noMatch') : t('tagCloud.none')}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {expanded ? (
        <TagCloudView
          countsUrl={countsUrl}
          selected={selected}
          excluded={excluded}
          reserved={reserved}
          busy={searching}
          wrapped={wrapped}
          onWrappedChange={setWrapped}
          onToggle={toggle}
          onToggleReserved={toggleReserved}
          onClear={clear}
          onClose={closeCloud}
          back={listed ? null : inDrawer ? t('nav.backToMenu') : t('tagCloud.close')}
        />
      ) : null}
    </div>
  );
}

// The site's own filters (RESERVED_TAGS): the thread tag, how firmly a pin's
// date is given, and how well the pin is evidenced. They read as tags and are
// picked like tags, but nobody wrote them, so they lead the cloud in a strip
// of their own - in their own order rather than by count, outlined and locked
// rather than sized - and never stand among the words people typed. A filter
// no pin here answers is left out, unless it is picked (which is how it is
// unpicked again).
function ReservedFilters({
  counts,
  selected,
  needle = '',
  onToggle,
  large = false,
  className = '',
}: {
  counts: TagCount[];
  selected: string[];
  // The find box narrows these too, by the name as it is read here.
  needle?: string;
  onToggle: (name: string) => void;
  // Bigger in the big cloud, where there is room; small in the panel.
  large?: boolean;
  className?: string;
}) {
  const t = useT();
  const on = (name: string) => selected.some((s) => s.toLowerCase() === name.toLowerCase());
  const shown = RESERVED_TAGS.map((filter) => ({
    ...filter,
    label: tagLabel(t, { name: filter.name, kind: 'reserved' }),
    count: counts.find((c) => c.name.toLowerCase() === filter.name.toLowerCase())?.count ?? 0,
  }))
    .filter((filter) => filter.count > 0 || on(filter.name))
    .filter((filter) => !needle || filter.label.toLowerCase().includes(needle) || filter.name.toLowerCase().includes(needle));
  if (!shown.length) return null;
  return (
    <div role="group" aria-label={t('tagCloud.reserved')} className={`flex flex-wrap items-center ${large ? 'gap-2' : 'gap-1.5'} ${className}`}>
      <span aria-hidden className={`mr-0.5 inline-flex items-center gap-1 font-semibold tracking-wide text-faint uppercase ${large ? 'text-xs' : 'text-[11px]'}`}>
        <Icon name="lock" className={large ? 'size-3.5' : 'size-3'} />
        {t('tagCloud.reserved')}
      </span>
      {shown.map((filter) => (
        <button
          key={filter.name}
          type="button"
          aria-pressed={on(filter.name)}
          onClick={() => onToggle(filter.name)}
          title={`${t('tagCloud.reservedTitle', { name: filter.label })}\n${t('tagCloud.pins', { count: filter.count })}`}
          className={`inline-flex items-center rounded-full border border-dashed transition-colors ${large ? 'gap-1.5 px-3 py-1 text-sm' : 'gap-1 px-1.5 py-0.5 text-[11px]'} ${
            on(filter.name) ? 'border-accent/60 bg-accent/15 text-link' : 'border-line text-muted hover:border-tint/40 hover:text-ink'
          }`}
        >
          <Icon name={filter.icon} className={`shrink-0 ${large ? 'size-4' : 'size-3'}`} />
          {filter.label}
          <span className="text-subtle tabular-nums">
            {filter.count}
            <span className="sr-only"> {t('tagCloud.pinsWord', { count: filter.count })}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// What a group wraps, under it: a category's tags, some of them groups of
// their own (an award body's years) that unfold in turn.
function Members({
  members,
  isSelected,
  isExcluded,
  onToggle,
  unfolded,
  onUnfold,
}: {
  members: TagGroup[];
  isSelected: (name: string) => boolean;
  isExcluded: (name: string) => boolean;
  onToggle: (name: string) => void;
  unfolded: Set<string>;
  onUnfold: (name: string) => void;
}) {
  const t = useT();
  return (
    <span className="flex basis-full flex-wrap items-baseline gap-x-2 gap-y-1 border-l border-line pl-2.5">
      {members.map((m) => {
        const inner = m.members;
        const open =
          !!inner && (unfolded.has(m.name) || (!isSelected(m.name) && !isExcluded(m.name) && tagMembers(m).some((t) => isSelected(t.name) || isExcluded(t.name))));
        return (
          <Fragment key={m.name}>
            <span className="inline-flex items-baseline">
              <button
                type="button"
                aria-pressed={isSelected(m.name)}
                onClick={() => onToggle(m.name)}
                title={`${m.name}: ${t('tagCloud.pins', { count: m.count })}${inner ? `, ${t('tagCloud.tags', { count: inner.length })}` : ''}`}
                className={`rounded-md px-1 text-left text-base leading-snug transition-colors xl:text-sm ${
                  isSelected(m.name) ? 'bg-accent/15 text-link ring-1 ring-accent/60 ring-inset' : isExcluded(m.name) ? EXCLUDED_CLASS : 'text-muted hover:text-ink'
                }`}
              >
                {m.name}
                {isExcluded(m.name) ? <span className="sr-only"> ({t('tagCloud.leftOut')})</span> : null}
                <span className="ml-1 text-sm text-subtle xl:text-xs">{m.count}</span>
              </button>
              {inner ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={t(open ? 'tagCloud.hideMembers' : 'tagCloud.showMembers', { count: inner.length, name: m.name })}
                  onClick={() => onUnfold(m.name)}
                  className="ml-0.5 rounded px-0.5 text-subtle hover:text-ink"
                >
                  <Icon name="chevron" className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              ) : null}
            </span>
            {open ? <Members members={inner!} isSelected={isSelected} isExcluded={isExcluded} onToggle={onToggle} unfolded={unfolded} onUnfold={onUnfold} /> : null}
          </Fragment>
        );
      })}
    </span>
  );
}

// The field that narrows the cloud. Its own clear button, not the browser's:
// the native one is a few px of cross jammed against the field's edge, which
// is a hard thing to hit. This one is a proper target and keeps the focus in
// the field, so the next tag can be typed straight away.
function FindTag({ value, onChange, className = '' }: { value: string; onChange: (value: string) => void; className?: string }) {
  const t = useT();
  const field = useRef<HTMLInputElement>(null);
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <input
        ref={field}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('tagCloud.find')}
        aria-label={t('tagCloud.find')}
        className="w-full rounded-full bg-field py-1.5 pr-9 pl-3.5 text-sm text-ink ring-1 ring-line ring-inset placeholder:text-subtle focus:ring-2 focus:ring-link focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label={t('tagCloud.findClear')}
          title={t('tagCloud.findClear')}
          onClick={() => {
            onChange('');
            field.current?.focus();
          }}
          // Sized to sit inside the field's pill: a larger circle would spill
          // over its rounded edge on hover.
          className="absolute right-1 flex size-7 items-center justify-center rounded-full text-subtle hover:bg-raised hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}

// Grouped: tags wrapped up into their larger category (an award body's
// years, the market exchanges), or every tag on its own.
function GroupedToggle({ wrapped, onChange }: { wrapped: boolean; onChange: (wrapped: boolean) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-pressed={wrapped}
      onClick={() => onChange(!wrapped)}
      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink aria-pressed:bg-accent/15 aria-pressed:text-link"
      title={wrapped ? t('tagCloud.ungroupTitle') : t('tagCloud.groupTitle')}
    >
      {t('tagCloud.grouped')}
    </button>
  );
}

// How many tags the big cloud reads.
const VIEW_LIMIT = 200;

const KIND_LABEL: Record<TagCount['kind'], MessageKey> = {
  award: 'tagCloud.kindAward',
  nomination: 'tagCloud.kindNomination',
  topic: 'tagCloud.kindTag',
  category: 'tagCloud.kindCategory',
  reserved: 'tagCloud.kindReserved',
};

// The tag cloud blown up over the page, WordArt style (WordCloud): up to 200
// tags packed into a cloud, the busiest largest, flowing around the pointer.
// Picks work as in the panel and leave it open, so several can be made.
function TagCloudView({
  countsUrl,
  selected,
  excluded,
  reserved,
  busy,
  wrapped,
  onWrappedChange,
  onToggle,
  onToggleReserved,
  onClear,
  onClose,
  back,
}: {
  countsUrl: string;
  selected: string[];
  excluded: string[];
  reserved: string[];
  busy: boolean;
  wrapped: boolean;
  onWrappedChange: (wrapped: boolean) => void;
  onToggle: (name: string) => void;
  onToggleReserved: (name: string) => void;
  onClear: () => void;
  onClose: () => void;
  // With no tag list the cloud is the tags' own page rather than a view
  // blown up from the panel, so below lg an arrow leading its header (named
  // this) goes back where it was opened from, in place of the close button.
  back: string | null;
}) {
  const titleId = useId();
  const t = useT();
  const [counts, setCounts] = useState<TagCount[] | null>(() => rememberedViewCounts);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('');
  const [hot, setHot] = useState<TagGroup | null>(null);
  const url = `${countsUrl}&limit=${VIEW_LIMIT}`;
  useScrollLock(true);
  const rootRef = useRef<HTMLDivElement>(null);

  // Everything but the cloud and the navbar's search box is put out of reach
  // while it is open - blurred (globals.css, by the attribute) and inert - so
  // the one thing to do besides picking tags is search.
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-tag-cloud', '');
    const header = document.querySelector('[data-navbar]');
    const shut: HTMLElement[] = [];
    const inert = (el: Element) => {
      if (el instanceof HTMLElement && !el.inert && el !== rootRef.current) {
        el.inert = true;
        shut.push(el);
      }
    };
    for (let el = header; el && el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sibling of el.parentElement.children) if (sibling !== el) inert(sibling);
    }
    header?.querySelectorAll(':scope > div > :not([data-search-slot]), [data-cloud-dim]').forEach(inert);
    return () => {
      html.removeAttribute('data-tag-cloud');
      for (const el of shut) el.inert = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.get<TagCount[]>(url).then(
      (next) => {
        if (cancelled) return;
        rememberedViewCounts = next;
        setCounts(next);
        setFailed(false);
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);

  const needle = filter.trim().toLowerCase();
  // As in the panel: the site's own filters keep their strip, and the words
  // in the cloud are the tags people wrote.
  const written = useMemo(() => (counts ?? []).filter((t) => t.kind !== 'reserved'), [counts]);
  const tags = useMemo<TagGroup[]>(() => {
    const flat = needle || !wrapped;
    const groups = flat ? [] : groupTags(written);
    const all = cloudTags(flat ? written : groups, flat ? selected : groupSelection(groups, selected), VIEW_LIMIT);
    return needle ? all.filter((t) => t.name.toLowerCase().includes(needle)) : all;
  }, [written, selected, needle, wrapped]);
  const onHot = useCallback((tag: TagCount | null) => setHot(tag ? (tags.find((t) => t.name === tag.name) ?? tag) : null), [tags]);

  // Portalled to the body, out of the floating controls' stacking context.
  // It starts under the navbar and sits below it (z-40) and its search
  // suggestions (z-50), so the search box stays in reach while the cloud is
  // open; above the floating controls (z-30). It fills the rest of the
  // screen, inset by a gutter wider than a phone.
  return createPortal(
    <div ref={rootRef} className="fixed inset-x-0 top-[52px] bottom-0 z-[35] flex items-center justify-center p-4 max-sm:p-0">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="floating relative flex size-full flex-col overflow-hidden max-sm:rounded-none max-sm:border-0">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3 max-sm:flex-wrap max-sm:px-3">
          {back ? (
            // Below lg only, where there is a drawer to go back to; wider, the
            // close button at the other end stays.
            <button type="button" onClick={onClose} className={`${iconButton} -ml-1.5 shrink-0 max-sm:-mr-1.5 lg:hidden`} aria-label={back} title={back}>
              <Icon name="back" className="size-5" />
            </button>
          ) : null}
          <Icon name="tag" className="size-5 shrink-0 text-link" />
          <h2 id={titleId} className="shrink-0 text-base font-semibold text-ink">
            {t('tagCloud.title')}
          </h2>
          {counts ? <span className="shrink-0 text-sm text-subtle">{t('tagCloud.tags', { count: written.length })}</span> : null}
          <FindTag value={filter} onChange={setFilter} className="min-w-0 flex-1 max-sm:order-last max-sm:basis-full" />
          <span className="flex shrink-0 items-center gap-3 max-sm:ml-auto">
            <GroupedToggle wrapped={wrapped} onChange={onWrappedChange} />
            {selected.length || reserved.length ? (
              <button type="button" onClick={onClear} className={iconButton} aria-label={t('tagCloud.clear')} title={t('tagCloud.clear')}>
                <Icon name="filter-off" className="size-5" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className={`${iconButton} ${back ? 'max-lg:hidden' : ''}`} aria-label={t('tagCloud.close')}>
              <Icon name="close" className="size-5" />
            </button>
          </span>
        </div>
        <ReservedFilters counts={counts ?? []} selected={reserved} needle={needle} onToggle={onToggleReserved} large className="border-b border-line px-5 py-2.5 max-sm:px-3" />
        <div aria-busy={busy || undefined} className="relative min-h-60 flex-1 overflow-hidden">
          {failed ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">{t('tagCloud.unavailable')}</p>
          ) : !counts ? (
            <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-subtle">
              {t('tagCloud.loading')}
            </p>
          ) : !tags.length ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">{needle ? t('tagCloud.noMatch') : t('tagCloud.none')}</p>
          ) : (
            <WordCloud
              tags={tags}
              selected={wrapped ? groupSelection(tags, selected) : selected}
              excluded={wrapped ? groupSelection(tags, excluded) : excluded}
              onToggle={onToggle}
              onHot={onHot}
            />
          )}
        </div>
        {/* One height whatever it says - two lines on a phone, one wider -
            so the cloud's box above it keeps its size as the pointer moves
            and across a pick, and its layout still fits the next page's. */}
        <p aria-live="polite" className="flex items-center border-t border-line px-5 py-2.5 text-xs text-subtle max-sm:px-3 max-sm:pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <span className="line-clamp-2 min-h-8 sm:line-clamp-1 sm:min-h-4">
            {hot ? (
              <>
                <span className="font-semibold text-ink">{tagLabel(t, hot)}</span>{' '}
                · {hot.members ? t('tagCloud.tags', { count: hot.members.length }) : t(KIND_LABEL[hot.kind])} · {t('tagCloud.pins', { count: hot.count })} ·{' '}
                {selected.some((s) => s.toLowerCase() === hot.name.toLowerCase())
                  ? t('tagCloud.clickToExclude')
                  : excluded.some((s) => s.toLowerCase() === hot.name.toLowerCase())
                    ? t('tagCloud.clickToDrop')
                    : t('tagCloud.clickToAdd')}
                {hot.members ? ` · ${t('tagCloud.wraps', { names: `${hot.members.slice(0, 4).map((m) => m.name.replace(hot.name, '').trim() || m.name).join(', ')}${hot.members.length > 4 ? '…' : ''}` })}` : ''}
              </>
            ) : (
              t('tagCloud.hint')
            )}
          </span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
