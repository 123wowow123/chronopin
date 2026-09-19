'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTagFoldOpen } from '@/components/timeline/FloatingControls';
import { Icon } from '@/components/ui/Icon';
import { canonicalCategory, isCategory } from '@/lib/categories';
import { parseSearchQuery } from '@/server/util/searchQuery';
import { useT } from '@/lib/client/i18n';
import { categoryLabel } from '@/lib/i18n/labels';
import type { Translator } from '@/lib/i18n/translate';

// Whether the panel was last left open.
let rememberedOpen = false;

// The map's category filter: a panel that folds to a summary of what is
// picked. Several categories widen each other (any of them). Picks are the
// query's tag: terms that name a category (categories are tags), and only
// show and hide the markers the map has, so a pick needs no refetch. Each
// pill shows how many of those markers carry it (counts keyed by lowercased
// category; null while loading). The timeline's filter is the tag cloud.
export function MapCategoryFilter({
  selected,
  onToggle,
  onClear,
  counts = null,
  busy = false,
  onOpenChange,
  className = '',
}: {
  selected: string[];
  onToggle: (category: string) => void;
  onClear: () => void;
  counts?: Record<string, number> | null;
  // Whether a pick is still being searched for, so the pills read as working.
  busy?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  // Unique, since Next keeps the previous page's panel mounted (hidden).
  const optionsId = useId();
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpenState] = useState(() => rememberedOpen);
  const setOpen = (next: boolean) => {
    rememberedOpen = next;
    setOpenState(next);
  };
  // Clicking (or Escape) anywhere but the panel folds it away, as the fold it
  // sits in already does narrower. Picks are inside it, so they leave it open.
  // On the click rather than the press: the controls under the panel rise into
  // its place as it shuts, and a press would move the one aimed at out from
  // under the pointer before it were clicked. A target its own handler has
  // already taken off the page was not a click beside the panel either.
  useEffect(() => {
    if (!open) return;
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
  }, [open]);
  // Narrower, the floating controls' pill stands in for the header,
  // and the pills may use the height between the navbar and that pill.
  const folded = useTagFoldOpen();
  const inFold = folded !== null;
  const showing = open || !!folded;
  useEffect(() => onOpenChange?.(showing), [showing, onOpenChange]);
  const isSelected = (category: string) => selected.some((s) => s.toLowerCase() === category.toLowerCase());
  const options = counts ? categoryOptions(counts, selected) : selected.map((name) => ({ name, count: null }));
  const summary = categorySummary(selected, t) || t('common.all');

  return (
    <div ref={rootRef} className={`floating text-sm ${className}`}>
      {/* Clearing the pick is its own button beside the chevron, so the row's
          contents are laid out plainly and the button that opens the panel
          lies under all of them - the whole row still opens it. */}
      <div className={`relative flex items-center gap-2 px-3.5 py-2.5 max-lg:py-3 ${inFold ? 'max-xl:hidden' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={optionsId}
          aria-label={t('map.categorySummary', { summary })}
          className="absolute inset-0 rounded-[inherit]"
        />
        <span className="pointer-events-none relative text-subtle">{t('map.category')}</span>
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
              aria-label={t('map.clearCategory')}
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
          aria-label={t('map.filterByCategory')}
          aria-busy={busy || undefined}
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
                {categoryLabel(t, category)}
                {count != null ? <span className="text-subtle tabular-nums">{count}</span> : null}
              </button>
            );
          })}
          {!counts ? (
            <p role="status" className="px-1 py-1 text-xs text-subtle">
              {t('map.loadingCategories')}
            </p>
          ) : !options.length ? (
            <p className="px-1 py-1 text-xs text-subtle">{t('map.noPinsToFilter')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// The round targets at the end of the header row (clear, open/close).
const iconButton = '-my-1 rounded-full p-1 text-subtle max-lg:p-2 hover:bg-raised hover:text-ink';

// What is picked, in brief ("Movies", "Movies +2"), or '' for nothing.
function categorySummary(selected: string[], t: Translator) {
  const first = selected.length ? categoryLabel(t, selected[0]) : '';
  return !selected.length ? '' : selected.length === 1 ? first : `${first} +${selected.length - 1}`;
}

// The categories a query picks: its tag: terms (and old category: ones) that name one.
export function queryCategories(query?: string) {
  return [...new Set(parseSearchQuery(query).tags.filter(isCategory).map(canonicalCategory))];
}

// The value on the floating controls' pill.
export function categoryPillSummary(query: string | undefined, t: Translator) {
  return categorySummary(queryCategories(query), t) || t('common.all');
}

// The pills: every category with pins (counts keyed by lowercased category),
// plus the picked ones so they can be unpicked even when nothing matches -
// busiest first, then by name.
function categoryOptions(counts: Record<string, number>, selected: string[] = []): { name: string; count: number }[] {
  const byKey = new Map<string, { name: string; count: number }>();
  for (const [key, count] of Object.entries(counts)) {
    if (key && count > 0) byKey.set(key.toLowerCase(), { name: canonicalCategory(key), count });
  }
  for (const name of selected) {
    const key = name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, { name: canonicalCategory(name), count: 0 });
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
