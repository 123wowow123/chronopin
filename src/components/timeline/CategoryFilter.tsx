'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client/api';
import { categoryOptions, canonicalCategory } from '@/lib/categories';
import { removeTerm, toggleTerm } from '@/lib/searchTerms';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { useCategoryFoldOpen } from './FloatingControls';

// Whether the panel was last left open. Search results remount with each
// query, so without this every pick would fold the panel away.
let rememberedOpen = false;
// The last counts fetched, shown while a remounted panel fetches its own so
// the pills do not blink out and back after each pick.
let rememberedCounts: Record<string, number> | null = null;

// One-click category filters: a panel that folds to a summary of what is
// picked. Several categories widen each other (any of them). What a click
// does is the caller's - the timeline edits the search query, the map filters
// the pins it has. Each pill can show how many pins it matches under the
// other filters (counts keyed by lowercased category; null while loading).
// The pills are whatever categories those pins have, busiest first, so the
// list follows the data rather than a fixed list.
export function CategoryFilter({
  selected,
  onToggle,
  onClear,
  counts = null,
  onOpenChange,
  className = '',
}: {
  selected: string[];
  onToggle: (category: string) => void;
  onClear: () => void;
  counts?: Record<string, number> | null;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  // Unique, since Next keeps the previous page's panel mounted (hidden).
  const optionsId = useId();
  const [open, setOpenState] = useState(() => rememberedOpen);
  const setOpen = (next: boolean) => {
    rememberedOpen = next;
    setOpenState(next);
  };
  // Narrower, the floating controls' category pill stands in for the header,
  // and the pills may use the height between the navbar and that pill.
  const folded = useCategoryFoldOpen();
  const inFold = folded !== null;
  const showing = open || !!folded;
  useEffect(() => onOpenChange?.(showing), [showing, onOpenChange]);
  const isSelected = (category: string) => selected.some((s) => s.toLowerCase() === category.toLowerCase());
  const options = counts ? categoryOptions(counts, selected) : selected.map((name) => ({ name, count: null }));
  const summary = categorySummary(selected) || 'All';

  return (
    <div className={`floating text-sm ${className}`}>
      {/* Clearing the pick is its own button beside the chevron, so the row's
          contents are laid out plainly and the button that opens the panel
          lies under all of them - the whole row still opens it. */}
      <div className={`relative flex items-center gap-2 px-3.5 py-2.5 max-lg:py-3 ${inFold ? 'max-xl:hidden' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={optionsId}
          aria-label={`Category: ${summary}`}
          className="absolute inset-0 rounded-[inherit]"
        />
        <span className="pointer-events-none relative text-subtle">Category</span>
        <span className="pointer-events-none relative min-w-0 truncate font-medium text-ink">{summary}</span>
        {/* Two matching targets. The chevron repeats what the row underneath
            does, so it is hidden from assistive tech and the tab order - it is
            here to be hovered and clicked, and to show which way the panel
            goes. */}
        <span className="pointer-events-none relative ml-auto flex shrink-0 items-center gap-1.5">
          {selected.length ? (
            <button
              type="button"
              onClick={onClear}
              className={`${iconButton} pointer-events-auto`}
              aria-label="Clear category filter"
            >
              <Icon name="filter-off" className="size-4" />
            </button>
          ) : null}
          <button type="button" tabIndex={-1} aria-hidden onClick={() => setOpen(!open)} className={`${iconButton} pointer-events-auto`}>
            <Icon name="chevron" className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </span>
      </div>
      {showing ? (
        <div
          id={optionsId}
          role="group"
          aria-label="Filter by category"
          className={`flex max-h-[min(22rem,50dvh)] flex-wrap gap-1.5 overflow-y-auto overscroll-contain px-3 pb-3 max-lg:gap-2 ${inFold ? 'max-xl:max-h-[calc(100dvh-7.5rem)] max-xl:pt-3' : ''} ${open ? '' : 'xl:hidden'}`}
        >
          {options.map(({ name: category, count }) => {
            const pressed = isSelected(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={pressed}
                onClick={() => onToggle(category)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium max-lg:px-3.5 max-lg:py-2 max-lg:text-sm ring-1 transition-colors ring-inset ${
                  pressed ? 'bg-accent/15 text-link ring-accent/60' : 'bg-field text-muted ring-line hover:bg-raised hover:text-ink'
                } ${count === 0 && !pressed ? 'opacity-50' : ''}`}
              >
                {category}
                {count != null ? <span className="text-subtle tabular-nums">{count}</span> : null}
              </button>
            );
          })}
          {!counts ? (
            <p role="status" className="px-1 py-1 text-xs text-subtle">
              Loading categories…
            </p>
          ) : !options.length ? (
            <p className="px-1 py-1 text-xs text-subtle">No pins to filter.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// The round targets at the end of the header row (clear, open/close).
const iconButton = '-my-1 rounded-full p-1 text-subtle max-lg:p-2 hover:bg-raised hover:text-ink';

// What is picked, in brief ("Movies", "Movies +2"), or '' for nothing.
function categorySummary(selected: string[]) {
  return !selected.length ? '' : selected.length === 1 ? selected[0] : `${selected[0]} +${selected.length - 1}`;
}

function selectedCategories(query?: string) {
  return [...new Set(parseSearchQuery(query).categories.map(canonicalCategory))];
}

// The value on the floating controls' category pill (under "Category").
export function categoryPillSummary(query?: string) {
  return categorySummary(selectedCategories(query)) || 'All';
}

// The category filter on the timeline and search results. Picks are
// category: terms in the search query, so the navbar search box shows and
// edits them like any other; off the search page a pick starts a search.
// Pill counts come from the server while the panel is open: the timeline's
// (no query) under its posted-within span, or the search's other terms.
export function SearchCategoryFilter({
  query,
  onlyWatched = false,
  postedWithin = null,
  createdSince = null,
  className,
}: {
  query?: string;
  onlyWatched?: boolean;
  postedWithin?: string | null;
  createdSince?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const selected = selectedCategories(query);
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number> | null>(() => rememberedCounts);

  const params = new URLSearchParams();
  if (query != null) params.set('q', query);
  if (query != null && onlyWatched) params.set('f', 'watch');
  if (createdSince) params.set('created_since', createdSince);
  else if (postedWithin) params.set('created_within', postedWithin);
  const countsUrl = `/api/pins/category-counts?${params.toString()}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.get<Record<string, number>>(countsUrl).then(
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
  }, [open, countsUrl]);

  function go(edit: (q: string) => string) {
    const params = new URLSearchParams(window.location.pathname === '/search' ? window.location.search : '');
    const q = edit(params.get('q') || '');
    if (q) params.set('q', q);
    else params.delete('q');
    // Nothing left to search for or filter by: that's the timeline.
    router.push(params.size ? `/search?${params.toString()}` : '/');
  }

  return (
    <CategoryFilter
      selected={selected}
      counts={counts}
      onOpenChange={setOpen}
      className={className}
      onToggle={(category) => go((q) => toggleTerm(q, 'category', category))}
      onClear={() => go((q) => selected.reduce((rest, category) => removeTerm(rest, 'category', category), q))}
    />
  );
}
