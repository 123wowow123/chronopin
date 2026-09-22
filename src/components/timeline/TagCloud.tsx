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
import { useTagFoldOpen } from './FloatingControls';
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
// Grouped (tags wrapped up into their larger category) or every tag on its
// own, shared by the panel and the big cloud.
let rememberedWrapped = true;

// How many tags the cloud shows before its filter box is needed.
const SHOWN = 60;
// A step up from what the cards use: the cloud is read at a glance, and its
// smallest tags were too small to pick out. Another step up between lg and
// xl, where the cloud has the screen to itself behind its pill rather than a
// 16rem column, and is read at arm's length.
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
  const [selected, setSelected] = useOptimistic(picked);
  const [reserved, setReserved] = useOptimistic(pickedFilters);

  const params = new URLSearchParams();
  if (query != null) params.set('q', query);
  if (query != null && onlyWatched) params.set('f', 'watch');
  if (createdSince) params.set('created_since', createdSince);
  else if (postedWithin) params.set('created_within', postedWithin);
  const countsUrl = `/api/pins/tag-counts?${params.toString()}`;

  const showing = open || !!folded;
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
  const tags = useMemo<TagGroup[]>(() => {
    if (needle) return cloudTags(written.filter((t) => t.name.toLowerCase().includes(needle)), [], SHOWN);
    if (!wrapped) return cloudTags(written, selected, SHOWN);
    // Picked tags outside any shown group stay listed on their own.
    return cloudTags(groups, groupSelection(groups, selected), SHOWN);
  }, [written, groups, selected, needle, wrapped]);
  const steps = useMemo(() => cloudSteps(tags), [tags]);
  const summary = tagSummary([...reserved, ...selected], t.locale);

  function go(edit: (q: string) => string, next: string[], nextReserved: string[] = reserved) {
    if (onQuery) {
      startSearch(() => {
        setSelected(next);
        setReserved(nextReserved);
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
    const widened = next.length + nextReserved.length < selected.length + reserved.length;
    startSearch(() => {
      setSelected(next);
      setReserved(nextReserved);
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
  // come out; what goes back in is always tag:.
  const withoutTag = (query: string, name: string) => removeTerm(removeTerm(query, 'category', name), 'tag', name);
  const toggle = (name: string) => {
    const picked = isSelected(name);
    go(
      (q) => (picked ? withoutTag(q, name) : refineQuery(withoutTag(q, name), 'tag', name)),
      picked ? selected.filter((s) => s.toLowerCase() !== name.toLowerCase()) : [...selected, name],
    );
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
  const clear = () => go((q) => reserved.reduce(withoutReserved, selected.reduce(withoutTag, q)), [], []);

  return (
    <div ref={rootRef} className={`floating flex min-h-0 flex-col text-sm ${inFold ? 'max-xl:h-full' : ''} ${className}`}>
      {/* The same row the sliders under it fold behind, with the big cloud's
          button on it as well. */}
      <PanelHeader
        caption={t('controls.tags')}
        value={summary}
        open={open}
        onToggle={() => setOpen(!open)}
        label={t('tagCloud.tagsSummary', { summary })}
        controls={optionsId}
        reset={selected.length || reserved.length ? { label: t('tagCloud.clear'), onClick: clear } : undefined}
        className={inFold ? 'max-xl:hidden' : ''}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`${iconButton} pointer-events-auto`}
          aria-label={t('tagCloud.expand')}
          title={t('tagCloud.expand')}
          aria-haspopup="dialog"
        >
          <Icon name="expand" className="size-4" />
        </button>
      </PanelHeader>
      {showing ? (
        // In the fold the cloud is the fold's; elsewhere the header row opens it.
        <div id={optionsId} className={`flex min-h-0 flex-col ${inFold ? 'max-xl:flex-1 max-xl:pt-3' : ''} ${inFold && !open ? 'xl:hidden' : ''}`}>
          <div className="flex items-center gap-2 px-3 pb-2">
            <FindTag value={filter} onChange={setFilter} className="min-w-0 flex-1" />
            <GroupedToggle wrapped={wrapped} onChange={setWrapped} />
          </div>
          {/* The site's filters lead the cloud inside its scroll rather than
              standing over it: in a column this narrow, a strip that stayed
              put would take the height the tags are read in. */}
          <div className={`max-h-[min(22rem,50dvh)] overflow-y-auto overscroll-contain px-3.5 pb-3 ${inFold ? 'max-xl:max-h-none max-xl:flex-1' : ''}`}>
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
                const partly = !pressed && tagMembers(tag).some((m) => isSelected(m.name));
                const open = !!members && (unfolded.has(tag.name) || partly);
                return (
                  <Fragment key={tag.name}>
                    <span className="inline-flex items-baseline">
                      <button
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => toggle(tag.name)}
                        title={`${tagLabel(t, tag)}: ${t('tagCloud.pins', { count: tag.count })}${members ? `, ${t('tagCloud.tags', { count: members.length })}` : ''}`}
                        className={`${STEP_CLASS[steps.get(tag.name.toLowerCase()) ?? 1]} rounded-md px-1 text-left leading-snug transition-colors ${
                          pressed
                            ? 'bg-accent/15 text-link ring-1 ring-accent/60 ring-inset'
                            : tag.kind === 'award' || tag.kind === 'nomination' || tag.kind === 'category'
                              ? 'text-ink hover:text-link'
                              : 'text-muted hover:text-ink'
                        } ${tag.count === 0 && !pressed ? 'opacity-50' : ''}`}
                      >
                        {tagLabel(t, tag)}
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
                    {open ? <Members members={members!} isSelected={isSelected} onToggle={toggle} unfolded={unfolded} onUnfold={unfold} /> : null}
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
          reserved={reserved}
          busy={searching}
          wrapped={wrapped}
          onWrappedChange={setWrapped}
          onToggle={toggle}
          onToggleReserved={toggleReserved}
          onClear={clear}
          onClose={() => setExpanded(false)}
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
  className = '',
}: {
  counts: TagCount[];
  selected: string[];
  // The find box narrows these too, by the name as it is read here.
  needle?: string;
  onToggle: (name: string) => void;
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
    <div role="group" aria-label={t('tagCloud.reserved')} className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span aria-hidden className="mr-0.5 inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
        <Icon name="lock" className="size-3" />
        {t('tagCloud.reserved')}
      </span>
      {shown.map((filter) => (
        <button
          key={filter.name}
          type="button"
          aria-pressed={on(filter.name)}
          onClick={() => onToggle(filter.name)}
          title={`${t('tagCloud.reservedTitle', { name: filter.label })}\n${t('tagCloud.pins', { count: filter.count })}`}
          className={`inline-flex items-center gap-1 rounded-full border border-dashed px-1.5 py-0.5 text-[11px] transition-colors ${
            on(filter.name) ? 'border-accent/60 bg-accent/15 text-link' : 'border-line text-muted hover:border-tint/40 hover:text-ink'
          }`}
        >
          <Icon name={filter.icon} className="size-3 shrink-0" />
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
  onToggle,
  unfolded,
  onUnfold,
}: {
  members: TagGroup[];
  isSelected: (name: string) => boolean;
  onToggle: (name: string) => void;
  unfolded: Set<string>;
  onUnfold: (name: string) => void;
}) {
  const t = useT();
  return (
    <span className="flex basis-full flex-wrap items-baseline gap-x-2 gap-y-1 border-l border-line pl-2.5">
      {members.map((m) => {
        const inner = m.members;
        const open = !!inner && (unfolded.has(m.name) || (!isSelected(m.name) && tagMembers(m).some((t) => isSelected(t.name))));
        return (
          <Fragment key={m.name}>
            <span className="inline-flex items-baseline">
              <button
                type="button"
                aria-pressed={isSelected(m.name)}
                onClick={() => onToggle(m.name)}
                title={`${m.name}: ${t('tagCloud.pins', { count: m.count })}${inner ? `, ${t('tagCloud.tags', { count: inner.length })}` : ''}`}
                className={`rounded-md px-1 text-left text-base leading-snug transition-colors xl:text-sm ${
                  isSelected(m.name) ? 'bg-accent/15 text-link ring-1 ring-accent/60 ring-inset' : 'text-muted hover:text-ink'
                }`}
              >
                {m.name}
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
            {open ? <Members members={inner!} isSelected={isSelected} onToggle={onToggle} unfolded={unfolded} onUnfold={onUnfold} /> : null}
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
  reserved,
  busy,
  wrapped,
  onWrappedChange,
  onToggle,
  onToggleReserved,
  onClear,
  onClose,
}: {
  countsUrl: string;
  selected: string[];
  reserved: string[];
  busy: boolean;
  wrapped: boolean;
  onWrappedChange: (wrapped: boolean) => void;
  onToggle: (name: string) => void;
  onToggleReserved: (name: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const t = useT();
  const [counts, setCounts] = useState<TagCount[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('');
  const [hot, setHot] = useState<TagGroup | null>(null);
  const url = `${countsUrl}&limit=${VIEW_LIMIT}`;
  useScrollLock(true);

  useEffect(() => {
    let cancelled = false;
    api.get<TagCount[]>(url).then(
      (next) => !cancelled && (setCounts(next), setFailed(false)),
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

  // Portalled to the body, above the navbar and out of the floating
  // controls' stacking context. On a phone it fills the screen.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-sm:p-0">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="floating relative flex h-[min(88dvh,56rem)] w-full max-w-6xl flex-col overflow-hidden max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3 max-sm:flex-wrap max-sm:px-3 max-sm:pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Icon name="tag" className="size-5 shrink-0 text-link" />
          <h2 id={titleId} className="shrink-0 text-base font-semibold text-ink">
            {t('tagCloud.title')}
          </h2>
          {counts ? <span className="shrink-0 text-sm text-subtle">{t('tagCloud.tags', { count: written.length })}</span> : null}
          <FindTag value={filter} onChange={setFilter} className="min-w-0 flex-1 max-sm:order-last max-sm:basis-full" />
          <span className="flex shrink-0 items-center gap-1 max-sm:ml-auto">
            <GroupedToggle wrapped={wrapped} onChange={onWrappedChange} />
            {selected.length || reserved.length ? (
              <button type="button" onClick={onClear} className={iconButton} aria-label={t('tagCloud.clear')} title={t('tagCloud.clear')}>
                <Icon name="filter-off" className="size-5" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className={iconButton} aria-label={t('tagCloud.close')}>
              <Icon name="close" className="size-5" />
            </button>
          </span>
        </div>
        <ReservedFilters counts={counts ?? []} selected={reserved} needle={needle} onToggle={onToggleReserved} className="border-b border-line px-5 py-2 max-sm:px-3" />
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
            <WordCloud tags={tags} selected={wrapped ? groupSelection(tags, selected) : selected} onToggle={onToggle} onHot={onHot} />
          )}
        </div>
        <p aria-live="polite" className="flex min-h-10 items-center gap-1.5 border-t border-line px-5 py-2.5 text-xs text-subtle max-sm:px-3 max-sm:pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {hot ? (
            <>
              <span className="font-semibold text-ink">{tagLabel(t, hot)}</span>
              <span>
                · {hot.members ? t('tagCloud.tags', { count: hot.members.length }) : t(KIND_LABEL[hot.kind])} · {t('tagCloud.pins', { count: hot.count })} ·{' '}
                {selected.some((s) => s.toLowerCase() === hot.name.toLowerCase()) ? t('tagCloud.clickToDrop') : t('tagCloud.clickToAdd')}
                {hot.members ? ` · ${t('tagCloud.wraps', { names: `${hot.members.slice(0, 4).map((m) => m.name.replace(hot.name, '').trim() || m.name).join(', ')}${hot.members.length > 4 ? '…' : ''}` })}` : ''}
              </span>
            </>
          ) : (
            t('tagCloud.hint')
          )}
        </p>
      </div>
    </div>,
    document.body,
  );
}
