'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useId, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { hrefKeepingDate } from '@/lib/client/returnSpot';
import { useScrollLock } from '@/lib/client/scrollLock';
import { removeTerm, toggleTerm } from '@/lib/searchTerms';
import { cloudSteps, cloudTags, groupSelection, groupTags, type TagCount, type TagGroup } from '@/lib/tags';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { useTagFoldOpen } from './FloatingControls';
import { WordCloud } from './WordCloud';

// Whether the panel was last left open. Search results remount with each
// query, so without this every pick would fold the panel away. The last
// counts fetched show while a remounted panel fetches its own, so the cloud
// does not blink out and back after each pick.
let rememberedOpen = false;
// Likewise the big cloud, so picks made in it do not close it.
let rememberedExpanded = false;
let rememberedCounts: TagCount[] | null = null;

// How many tags the cloud shows before its filter box is needed.
const SHOWN = 60;
const STEP_CLASS = ['', 'text-xs', 'text-[13px]', 'text-sm', 'text-base', 'text-lg font-semibold'];

// What is picked, in brief ("Artemis", "Artemis +2"), or 'All' for nothing.
function tagSummary(selected: string[]) {
  return !selected.length ? 'All' : selected.length === 1 ? selected[0] : `${selected[0]} +${selected.length - 1}`;
}

// The value on the floating controls' tags pill (under "Tags").
export function tagPillSummary(query?: string) {
  return tagSummary(parseSearchQuery(query).tags);
}

// A trophy for a win's tag, a ribbon for a nomination's: a nomination must
// not read as a win (a muted trophy still did).
function Trophy({ kind, className = '' }: { kind: TagCount['kind']; className?: string }) {
  if (kind !== 'award' && kind !== 'nomination') return null;
  return (
    <span aria-hidden className={className}>
      {kind === 'nomination' ? '🎗️' : '🏆'}
    </span>
  );
}

// The tag filter in the floating controls, under the category filter and
// built like it: a row saying what is picked that unfolds, in place, into a
// cloud of the tags of the pins showing - the timeline's, or the search's
// results with its tag: terms left out - sized by how many pins carry each.
// Unfolded, it takes height from the panels under it (trending, new pins),
// which drop out when there is no room. A tag toggles its tag: term in the
// search query, so it shows and is edited in the navbar's search box; off the
// search page a pick starts a search.
export function TagCloud({
  query,
  onlyWatched = false,
  postedWithin = null,
  createdSince = null,
  className = '',
}: {
  query?: string;
  onlyWatched?: boolean;
  postedWithin?: string | null;
  createdSince?: string | null;
  className?: string;
}) {
  const router = useRouter();
  // In the floating controls' tags fold (below xl, behind its own pill): the
  // pill is the header, and the cloud shows while the fold is open.
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
  const [searching, startSearch] = useTransition();
  const picked = useMemo(() => parseSearchQuery(query).tags, [query]);
  const [selected, setSelected] = useOptimistic(picked);

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
  // category filter does. On the click rather than the press, and not for a
  // target its own handler already took off the page (see CategoryFilter).
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
  // Tags wrap up into their larger category (an award body's years, the
  // market exchanges); finding a tag looks through the wrapped ones too.
  const groups = useMemo(() => groupTags(counts ?? []), [counts]);
  const isSelected = (name: string) => selected.some((s) => s.toLowerCase() === name.toLowerCase());
  const tags = useMemo<TagGroup[]>(() => {
    if (needle) return cloudTags((counts ?? []).filter((t) => t.name.toLowerCase().includes(needle)), [], SHOWN);
    // Picked tags outside any shown group stay listed on their own.
    return cloudTags(groups, groupSelection(groups, selected), SHOWN);
  }, [counts, groups, selected, needle]);
  const steps = useMemo(() => cloudSteps(tags), [tags]);
  const summary = tagSummary(selected);

  function go(edit: (q: string) => string, next: string[]) {
    const current = new URLSearchParams(window.location.pathname === '/search' ? window.location.search : '');
    const q = edit(current.get('q') || '');
    if (q) current.set('q', q);
    else current.delete('q');
    // Nothing left to search for or filter by: that's the timeline.
    const href = current.size ? `/search?${current.toString()}` : '/';
    // Fewer tags picked is a wider search, which stays on the same date.
    const widened = next.length < selected.length;
    startSearch(() => {
      setSelected(next);
      router.push(widened ? hrefKeepingDate(href) : href);
    });
  }

  const toggle = (name: string) =>
    go((q) => toggleTerm(q, 'tag', name), isSelected(name) ? selected.filter((s) => s.toLowerCase() !== name.toLowerCase()) : [...selected, name]);
  const clear = () => go((q) => selected.reduce((rest, name) => removeTerm(rest, 'tag', name), q), []);

  return (
    <div ref={rootRef} className={`floating flex min-h-0 flex-col text-sm ${inFold ? 'max-xl:h-full' : ''} ${className}`}>
      {/* As the category filter's: clearing is its own button beside the
          chevron, and the button that opens the panel lies under the row. */}
      <div className={`relative flex items-center gap-2 px-3.5 py-2.5 max-lg:py-3 ${inFold ? 'max-xl:hidden' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={optionsId}
          aria-label={`Tags: ${summary}`}
          className="absolute inset-0 rounded-[inherit]"
        />
        <span className="pointer-events-none relative text-subtle">Tags</span>
        <span className="pointer-events-none relative min-w-0 truncate font-medium text-ink">{summary}</span>
        <span className="pointer-events-none relative ml-auto flex shrink-0 items-center gap-1.5">
          {selected.length ? (
            <button type="button" onClick={clear} className={`${iconButton} pointer-events-auto`} aria-label="Clear tag filter">
              <Icon name="filter-off" className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`${iconButton} pointer-events-auto`}
            aria-label="Expand tag cloud"
            title="Expand tag cloud"
            aria-haspopup="dialog"
          >
            <Icon name="expand" className="size-4" />
          </button>
          <button type="button" tabIndex={-1} aria-hidden onClick={() => setOpen(!open)} className={`${iconButton} pointer-events-auto`}>
            <Icon name="chevron" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </span>
      </div>
      {showing ? (
        // In the fold the cloud is the fold's, on phones; from xl up the header row opens it.
        <div id={optionsId} className={`flex min-h-0 flex-col ${inFold ? 'max-xl:flex-1 max-xl:pt-3' : ''} ${inFold && !open ? 'xl:hidden' : ''}`}>
          <div className="px-3 pb-2">
            <FindTag value={filter} onChange={setFilter} className="w-full" />
          </div>
          <div
            role="group"
            aria-label="Filter by tag"
            aria-busy={searching || undefined}
            className={`flex max-h-[min(22rem,50dvh)] flex-wrap content-start items-baseline gap-x-2.5 gap-y-1.5 overflow-y-auto overscroll-contain px-3.5 pb-3 ${inFold ? 'max-xl:max-h-none max-xl:flex-1' : ''}`}
          >
            {tags.map((tag) => {
              const members = tag.members;
              const pressed = isSelected(tag.name);
              const partly = !pressed && !!members?.some((m) => isSelected(m.name));
              const open = !!members && (unfolded.has(tag.name) || partly);
              return (
                <Fragment key={tag.name}>
                  <span className="inline-flex items-baseline">
                    <button
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => toggle(tag.name)}
                      title={`${tag.name}: ${tag.count} ${tag.count === 1 ? 'pin' : 'pins'}${members ? `, ${members.length} tags` : ''}`}
                      className={`${STEP_CLASS[steps.get(tag.name.toLowerCase()) ?? 1]} rounded-md px-1 text-left leading-snug transition-colors ${
                        pressed
                          ? 'bg-accent/15 text-link ring-1 ring-accent/60 ring-inset'
                          : tag.kind === 'award' || tag.kind === 'nomination'
                            ? 'text-ink hover:text-link'
                            : 'text-muted hover:text-ink'
                      } ${tag.count === 0 && !pressed ? 'opacity-50' : ''}`}
                    >
                      <Trophy kind={tag.kind} className="mr-0.5 text-[0.85em]" />
                      {tag.name}
                      <span className="sr-only">
                        , {tag.count} {tag.count === 1 ? 'pin' : 'pins'}
                      </span>
                    </button>
                    {members ? (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`${open ? 'Hide' : 'Show'} the ${members.length} tags in ${tag.name}`}
                        title={`${members.length} tags inside`}
                        onClick={() =>
                          setUnfolded((prev) => {
                            const next = new Set(prev);
                            if (!next.delete(tag.name)) next.add(tag.name);
                            return next;
                          })
                        }
                        className="ml-0.5 rounded px-0.5 text-[11px] text-subtle hover:text-ink"
                      >
                        <Icon name="chevron" className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                    ) : null}
                  </span>
                  {open ? (
                    <span className="flex basis-full flex-wrap items-baseline gap-x-2 gap-y-1 border-l border-line pl-2.5">
                      {members!.map((m) => (
                        <button
                          key={m.name}
                          type="button"
                          aria-pressed={isSelected(m.name)}
                          onClick={() => toggle(m.name)}
                          title={`${m.name}: ${m.count} ${m.count === 1 ? 'pin' : 'pins'}`}
                          className={`rounded-md px-1 text-left text-xs leading-snug transition-colors ${
                            isSelected(m.name) ? 'bg-accent/15 text-link ring-1 ring-accent/60 ring-inset' : 'text-muted hover:text-ink'
                          }`}
                        >
                          {m.name}
                          <span className="ml-1 text-subtle">{m.count}</span>
                        </button>
                      ))}
                    </span>
                  ) : null}
                </Fragment>
              );
            })}
            {!counts ? (
              <p role="status" className="py-1 text-xs text-subtle">
                Loading tags…
              </p>
            ) : !tags.length ? (
              <p className="py-1 text-xs text-subtle">{needle ? 'No tag matches.' : 'No tags on these pins yet.'}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {expanded ? (
        <TagCloudView countsUrl={countsUrl} selected={selected} busy={searching} onToggle={toggle} onClear={clear} onClose={() => setExpanded(false)} />
      ) : null}
    </div>
  );
}

function FindTag({ value, onChange, className = '' }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Find a tag"
      aria-label="Find a tag"
      className={`rounded-full bg-field px-3.5 py-1.5 text-sm text-ink ring-1 ring-line ring-inset placeholder:text-subtle focus:ring-2 focus:ring-link focus:outline-none ${className}`}
    />
  );
}

// How many tags the big cloud reads.
const VIEW_LIMIT = 200;

const KIND_LABEL: Record<TagCount['kind'], string> = { award: 'Award', nomination: 'Nomination', topic: 'Tag' };

// The tag cloud blown up over the page, WordArt style (WordCloud): up to 200
// tags packed into a cloud, the busiest largest, flowing around the pointer.
// Picks work as in the panel and leave it open, so several can be made.
function TagCloudView({
  countsUrl,
  selected,
  busy,
  onToggle,
  onClear,
  onClose,
}: {
  countsUrl: string;
  selected: string[];
  busy: boolean;
  onToggle: (name: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const [counts, setCounts] = useState<TagCount[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState('');
  const [hot, setHot] = useState<TagGroup | null>(null);
  // Wrapped up into larger categories, or every tag on its own.
  const [wrapped, setWrapped] = useState(true);
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
  const tags = useMemo<TagGroup[]>(() => {
    const flat = needle || !wrapped;
    const groups = flat ? [] : groupTags(counts ?? []);
    const all = cloudTags(flat ? (counts ?? []) : groups, flat ? selected : groupSelection(groups, selected), VIEW_LIMIT);
    return needle ? all.filter((t) => t.name.toLowerCase().includes(needle)) : all;
  }, [counts, selected, needle, wrapped]);
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
            Tag cloud
          </h2>
          {counts ? <span className="shrink-0 text-sm text-subtle">{counts.length} tags</span> : null}
          <FindTag value={filter} onChange={setFilter} className="min-w-0 flex-1 max-sm:order-last max-sm:basis-full" />
          <span className="flex shrink-0 items-center gap-1 max-sm:ml-auto">
            <button
              type="button"
              aria-pressed={wrapped}
              onClick={() => setWrapped(!wrapped)}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line ring-inset hover:bg-raised hover:text-ink aria-pressed:bg-accent/15 aria-pressed:text-link"
              title={wrapped ? 'Show every tag on its own' : 'Wrap tags up into larger categories'}
            >
              Grouped
            </button>
            {selected.length ? (
              <button type="button" onClick={onClear} className={iconButton} aria-label="Clear tag filter" title="Clear tag filter">
                <Icon name="filter-off" className="size-5" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className={iconButton} aria-label="Close tag cloud">
              <Icon name="close" className="size-5" />
            </button>
          </span>
        </div>
        <div aria-busy={busy || undefined} className="relative min-h-60 flex-1 overflow-hidden">
          {failed ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">Tags are unavailable right now.</p>
          ) : !counts ? (
            <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-subtle">
              Loading tags…
            </p>
          ) : !tags.length ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-subtle">{needle ? 'No tag matches.' : 'No tags on these pins yet.'}</p>
          ) : (
            <WordCloud tags={tags} selected={wrapped ? groupSelection(tags, selected) : selected} onToggle={onToggle} onHot={onHot} />
          )}
        </div>
        <p aria-live="polite" className="flex min-h-10 items-center gap-1.5 border-t border-line px-5 py-2.5 text-xs text-subtle max-sm:px-3 max-sm:pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {hot ? (
            <>
              <Trophy kind={hot.kind} />
              <span className="font-semibold text-ink">{hot.name}</span>
              <span>
                · {hot.members ? `${hot.members.length} tags` : KIND_LABEL[hot.kind]} · {hot.count} {hot.count === 1 ? 'pin' : 'pins'} · click to {selected.some((s) => s.toLowerCase() === hot.name.toLowerCase()) ? 'drop it from' : 'add it to'} the search
                {hot.members ? ` · wraps ${hot.members.slice(0, 4).map((m) => m.name.replace(hot.name, '').trim() || m.name).join(', ')}${hot.members.length > 4 ? '…' : ''}` : ''}
              </span>
            </>
          ) : (
            'Bigger words are on more pins. Move the pointer through the cloud, and pick tags to search for pins with any of them.'
          )}
        </p>
      </div>
    </div>,
    document.body,
  );
}

// The round targets at the end of the header row (clear, open/close).
const iconButton = '-my-1 rounded-full p-1 text-subtle max-lg:p-2 hover:bg-raised hover:text-ink';
