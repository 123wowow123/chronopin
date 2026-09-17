'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { canonicalCategory } from '@/lib/categories';
import { api } from '@/lib/client/api';
import { useSession } from '@/lib/client/session';
import { useTimeZone } from '@/lib/client/timeZone';
import { formatStart } from '@/lib/format';
import type { PinJson } from '@/lib/types';
import { joinSearchQuery, splitSearchQuery, type QueryPart } from '@/server/util/searchQuery';

export const WATCHED = 'watch';

// Where a search goes: /search, or the map's own when searching from it.
// Nothing to search for and nothing to filter by is the timeline (or the
// whole map).
export function searchHref(onMap: boolean, q: string, filter: string) {
  if (!q.trim() && !filter) return onMap ? '/map' : '/';
  const next = new URLSearchParams();
  if (q) next.set('q', q);
  if (filter) next.set('f', filter);
  return `${onMap ? '/map' : '/search'}?${next.toString()}`;
}

type TermPart = Extract<QueryPart, { kind: 'term' }>;

// A term with a value to show; an empty one (category:"") stays as text.
const isPill = (part: QueryPart): part is TermPart => part.kind === 'term' && !!part.value.replace(/^@+/, '');

// A query as the box shows it, in order: label terms as pills and the free
// text between them as plain runs.
function toItems(query: string): QueryPart[] {
  return splitSearchQuery(query).flatMap((part): QueryPart[] => {
    if (isPill(part)) return [part];
    const raw = part.raw.trim();
    return raw ? [{ kind: 'text', raw }] : [];
  });
}

// How a term reads as a pill: the field it filters, and its value in the
// spelling the site uses (the category list's, a user's leading @).
function termLabel(part: TermPart) {
  if (part.field === 'user') return { field: null, value: `@${part.value.replace(/^@+/, '')}` };
  return { field: part.field, value: part.field === 'category' ? canonicalCategory(part.value) : part.value };
}

// The navbar search: suggestions by title as you type, Enter to search, and a
// Watched-only toggle for signed-in users (lg and up; below, it is in the drawer). The query sits in the box as items:
// label terms (user:, company:, category:, @name) as pills and free text as
// plain runs. The text field only ever holds the one item being edited -
// clicking an item opens just that one, in its place, and leaving it (or
// opening another) puts what was typed back as items. Otherwise the field
// waits after the items for something new.
// How long the typing has to pause before suggestions are asked for.
const SUGGEST_DELAY_MS = 150;

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { isLoggedIn } = useSession();
  const timeZone = useTimeZone('UTC');

  // The map searches its own pins; everywhere else a search opens /search.
  const onMap = pathname === '/map';
  const urlQuery = pathname === '/search' || onMap ? params.get('q') || '' : '';
  const urlChoice = pathname === '/search' || onMap ? params.get('f') || '' : '';
  const [items, setItems] = useState(() => toItems(urlQuery));
  // The text field's position among the items, and what it holds.
  const [editAt, setEditAt] = useState(() => toItems(urlQuery).length);
  const [draft, setDraft] = useState('');
  // Whether the field holds an item opened from the box, rather than new text.
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(urlChoice);
  const watchedOnly = choice === WATCHED;
  const [suggestions, setSuggestions] = useState<PinJson[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const requestId = useRef(0);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const boxRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  // Where to put the caret once the field has moved to the item it opened.
  const pendingCaret = useRef<number | null>(null);
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);
  // The field as last sized, so the row only follows the caret on a change and
  // not on every render (it would undo scrolling the pills while typing).
  const sizedFor = useRef('');

  // The items with the field's text put back where it sits.
  const committed = (text = draft, from = items, at = editAt) => [...from.slice(0, at), ...toItems(text), ...from.slice(at)];
  const query = (text = draft) => joinSearchQuery(committed(text));

  // Follow the URL (back/forward, label clicks).
  const [lastUrl, setLastUrl] = useState(`${urlQuery}|${urlChoice}`);
  if (lastUrl !== `${urlQuery}|${urlChoice}`) {
    setLastUrl(`${urlQuery}|${urlChoice}`);
    const next = toItems(urlQuery);
    setItems(next);
    setEditAt(next.length);
    setDraft('');
    setEditing(false);
    setChoice(urlChoice);
  }

  // How wide text is in the field's font.
  function textWidth(input: HTMLInputElement, text: string) {
    const context = (measureRef.current ??= document.createElement('canvas').getContext('2d'));
    if (!context) return text.length * 8;
    context.font = getComputedStyle(input).font;
    return context.measureText(text).width;
  }

  // The field never scrolls its own text, which would hide the start of a
  // long term; it is as wide as its text, and the row scrolls to the caret.
  function revealCaret() {
    const input = inputRef.current;
    const row = rowRef.current;
    if (!input || !row) return;
    const before = input.value.slice(0, input.selectionStart ?? input.value.length);
    const caret = input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft) + textWidth(input, before);
    const bounds = row.getBoundingClientRect();
    const margin = 12;
    if (caret + margin > bounds.right) row.scrollLeft += caret + margin - bounds.right;
    else if (caret - margin < bounds.left) row.scrollLeft -= bounds.left - (caret - margin);
  }

  // Every render: the text, the field's place and its padding all change its width.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const style = getComputedStyle(input);
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    // A couple of pixels over, for the caret.
    input.style.width = `${Math.ceil(textWidth(input, draft || input.placeholder) + padding + 2)}px`;
    const key = `${draft}|${editAt}|${editing}`;
    if (key !== sizedFor.current && document.activeElement === input) revealCaret();
    sizedFor.current = key;
  });

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current == null || !input) return;
    input.focus();
    input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    revealCaret();
    pendingCaret.current = null;
  });

  // The items scroll sideways when they overflow the box. A mouse wheel only
  // scrolls up and down, so it scrolls the row instead - natively, as React's
  // wheel listener is passive and could not keep the page still.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onWheel = (event: WheelEvent) => {
      if (row.scrollWidth <= row.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      event.preventDefault();
      row.scrollLeft += event.deltaY;
    };
    row.addEventListener('wheel', onWheel, { passive: false });
    return () => row.removeEventListener('wheel', onWheel);
  }, []);

  // A pause waiting to be asked about does not outlive the box.
  useEffect(() => () => clearTimeout(suggestTimer.current), []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Closes the suggestions and drops any still coming: a pause not yet over, or
  // an answer on its way, would otherwise open them again over the results.
  function closeSuggestions() {
    clearTimeout(suggestTimer.current);
    requestId.current++;
    setSuggestions([]);
    setActive(-1);
    setOpen(false);
  }

  function submit(q: string, filter = choice) {
    closeSuggestions();
    router.push(searchHref(onMap, q, filter));
  }

  function suggest(value: string) {
    setDraft(value);
    setActive(-1);
    const id = ++requestId.current;
    clearTimeout(suggestTimer.current);
    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    // Suggestions wait for a break in the typing: a typed phrase asked for one
    // list rather than one per letter, none of which was on screen long enough
    // to read. requestId still settles answers that arrive out of order.
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await api.get<{ pins: PinJson[] }>(`/api/pins/autocomplete?q=${encodeURIComponent(value)}`);
        if (id === requestId.current) {
          setSuggestions(res.pins || []);
          setOpen((res.pins || []).length > 0);
        }
      } catch {
        // suggestions are optional
      }
    }, SUGGEST_DELAY_MS);
  }

  // Puts the field's text back as items and moves the field to `at` (counted
  // in the items as they were), holding `text`.
  function moveField(at: number, text: string, caret: number | null) {
    const added = toItems(draft);
    const all = committed();
    // Items after the field shift along by whatever its text became.
    const target = at > editAt ? at + added.length : at;
    setItems(all);
    setEditAt(Math.min(target, all.length));
    setDraft(text);
    setEditing(false);
    closeSuggestions();
    pendingCaret.current = caret;
  }

  // Opens one item for editing, in its place, closing any other.
  function editItem(index: number) {
    const added = toItems(draft);
    const all = committed();
    const target = index >= editAt ? index + added.length : index;
    const raw = all[target].raw;
    setItems(all.filter((_, i) => i !== target));
    setEditAt(target);
    setDraft(raw);
    setEditing(true);
    closeSuggestions();
    pendingCaret.current = raw.length;
  }

  function removeItem(index: number) {
    const rest = items.filter((_, i) => i !== index);
    setItems(rest);
    if (index < editAt) setEditAt(editAt - 1);
    submit(joinSearchQuery(committed(draft, rest, index < editAt ? editAt - 1 : editAt)));
  }

  const input = (
    <input
      ref={inputRef}
      id="site-search"
      type="search"
      name="q"
      autoComplete="off"
      placeholder={items.length ? '' : 'Search'}
      value={draft}
      onChange={(event) => suggest(event.target.value)}
      onFocus={() => {
        revealCaret();
        setOpen(suggestions.length > 0 && !!draft);
      }}
      // Arrow keys, Home/End and clicks move the caret without a change.
      onKeyUp={revealCaret}
      onMouseUp={revealCaret}
      // Leaving the field: what it holds goes back as items, and the field
      // waits after them.
      onBlur={() => moveField(Number.MAX_SAFE_INTEGER, '', null)}
      onKeyDown={(event) => {
        // Backspace in an empty field opens the item before it.
        if (event.key === 'Backspace' && !draft && editAt > 0) {
          event.preventDefault();
          editItem(editAt - 1);
          return;
        }
        if (!open) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setActive((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setActive((i) => Math.max(i - 1, -1));
        } else if (event.key === 'Escape') {
          // Only the suggestions close; a search field would also clear its text.
          event.preventDefault();
          setOpen(false);
        }
      }}
      // As wide as its text (set above), never narrower; after the items it
      // also takes whatever of the row is left. An opened item is shaded.
      className={`shrink-0 text-sm text-ink placeholder:text-subtle focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden ${
        editAt >= items.length ? 'min-w-[5rem] grow' : ''
      } ${editing ? 'h-7 rounded-md bg-raised px-1.5' : 'h-9 bg-transparent pr-2'}`}
      role="combobox"
      aria-expanded={open}
      aria-controls="search-suggestions"
    />
  );

  return (
    <form
      ref={boxRef}
      role="search"
      className="relative flex w-full min-w-0 items-stretch gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(query(active >= 0 ? suggestions[active].title : draft));
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search
      </label>
      <div
        className="relative flex min-w-0 flex-1 cursor-text items-center rounded-full bg-field text-muted ring-1 ring-line transition-shadow ring-inset focus-within:ring-2 focus-within:ring-link"
        // A press on the box itself, not an item or button, types something new
        // after the items.
        onMouseDown={(event) => {
          if (event.target === inputRef.current || (event.target as Element).closest('button')) return;
          event.preventDefault();
          if (editAt < items.length) moveField(Number.MAX_SAFE_INTEGER, '', 0);
          else inputRef.current?.focus();
        }}
      >
        <Icon name="search" className="ml-3 size-4 shrink-0 text-subtle" />
        <div
          ref={rowRef}
          className="flex h-9 min-w-0 flex-1 items-center gap-1 overflow-x-auto overscroll-x-contain pl-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => {
            // Pressing an item must not blur the field first: that would move
            // the field before this item opens.
            const keepFocus = (event: React.MouseEvent) => event.preventDefault();
            let node;
            if (!isPill(item)) {
              node = (
                <button
                  type="button"
                  aria-label={`Edit ${item.raw}`}
                  onMouseDown={keepFocus}
                  onClick={() => editItem(index)}
                  className="shrink-0 rounded px-0.5 text-sm whitespace-nowrap text-ink hover:bg-raised max-lg:text-base"
                >
                  {item.raw}
                </button>
              );
            } else {
              const { field, value } = termLabel(item);
              const name = `${field ? `${field} ` : ''}${value}`;
              node = (
                <span className="inline-flex shrink-0 items-center rounded-full bg-accent/15 text-xs font-medium whitespace-nowrap text-link ring-1 ring-accent/60 ring-inset">
                  <button type="button" title="Edit" aria-label={`Edit ${name}`} onMouseDown={keepFocus} onClick={() => editItem(index)} className="flex items-center gap-1 py-0.5 pl-2">
                    {field ? <span className="text-subtle">{field}</span> : null}
                    <span>{value}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onMouseDown={keepFocus}
                    onClick={() => removeItem(index)}
                    className="mx-0.5 rounded-full p-0.5 text-subtle hover:bg-raised hover:text-ink"
                  >
                    <Icon name="close" className="size-3" />
                  </button>
                </span>
              );
            }
            return (
              <Fragment key={`${index}:${item.raw}`}>
                {index === editAt ? input : null}
                {node}
              </Fragment>
            );
          })}
          {editAt >= items.length ? input : null}
        </div>
        {draft || items.length ? (
          <button
            type="button"
            className="mr-1.5 rounded-full p-1.5 text-subtle hover:bg-raised hover:text-ink"
            aria-label="Clear search"
            onClick={() => {
              setItems([]);
              setEditAt(0);
              setDraft('');
              setEditing(false);
              closeSuggestions();
              router.push(onMap ? '/map' : '/');
            }}
          >
            <Icon name="close" className="size-3.5" />
          </button>
        ) : null}
      </div>

      {isLoggedIn ? (
        <button
          type="button"
          aria-pressed={watchedOnly}
          title={watchedOnly ? 'Showing only pins you watch — click to show all' : 'Show only pins you watch'}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 transition-colors ring-inset max-lg:hidden ${
            watchedOnly ? 'bg-accent/15 text-link ring-accent/60' : 'bg-field text-muted ring-line hover:bg-raised hover:text-ink'
          }`}
          onClick={() => {
            const next = watchedOnly ? '' : WATCHED;
            setChoice(next);
            submit(query(), next);
          }}
        >
          <Icon name="eye" className="size-4" />
          Watched
        </button>
      ) : null}

      {/* On phones the search box is too narrow for titles, so the list spans
          the screen under the header, like the notifications panel. */}
      {open ? (
        <ul
          id="search-suggestions"
          role="listbox"
          className="floating fixed inset-x-3 top-[60px] z-50 max-h-[min(28rem,calc(100dvh-5rem))] overflow-auto p-1.5 sm:absolute sm:inset-x-0 sm:top-full sm:mt-2"
        >
          {suggestions.map((pin, index) => (
            <li
              key={pin.id}
              role="option"
              aria-selected={index === active}
              className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${index === active ? 'bg-raised' : ''}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                setDraft(pin.title);
                submit(query(pin.title));
              }}
            >
              <Icon name="search" className="mt-0.5 size-3.5 shrink-0 text-faint" />
              <span className="min-w-0">
                <span className="line-clamp-2 text-ink sm:line-clamp-1">{pin.title}</span>
                <span className="block text-xs text-subtle">{formatStart(pin, timeZone)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
