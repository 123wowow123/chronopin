'use client';

import { usePathname, useRouter, useSearchParams } from '@/lib/client/navigation';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { canonicalCategory } from '@/lib/categories';
import { api } from '@/lib/client/api';
import { hrefKeepingDate } from '@/lib/client/returnSpot';
import { useSession } from '@/lib/client/session';
import { useTimeZone } from '@/lib/client/timeZone';
import { formatStart } from '@/lib/format';
import { hasTerm, term } from '@/lib/searchTerms';
import { reservedName, reservedTag, type ReservedTag, type TagCount } from '@/lib/tags';
import type { PinJson } from '@/lib/types';
import { joinSearchQuery, splitSearchQuery, type QueryPart } from '@/server/util/searchQuery';
import { useT } from '@/lib/client/i18n';
import { categoryLabel, tagLabel } from '@/lib/i18n/labels';
import type { MessageKey, Translator } from '@/lib/i18n/translate';

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

// Where a selection reaches to: a place among the items, and how far into
// that one it goes. A pill is one thing, so a selection takes it whole - its
// character is only ever 0 or the end of it.
type Spot = { at: number; char: number };
type Selection = { lo: Spot; hi: Spot };

// Which of two places in the query comes first, and by how much.
function compareSpots(a: Spot, b: Spot) {
  return a.at !== b.at ? a.at - b.at : a.char - b.char;
}

// The two ends of a drag in the order they read. Nothing is selected while
// they are still the same place.
function ordered(anchor: Spot, focus: Spot): Selection | null {
  const order = compareSpots(anchor, focus);
  if (!order) return null;
  return order < 0 ? { lo: anchor, hi: focus } : { lo: focus, hi: anchor };
}

// One place along `list` from `spot`, the way `step` goes, or nothing at the
// end it is already at. A pill is one thing, so a step onto one takes all of
// it, and the space between two items is not a place worth stopping at.
function stepSpot(list: QueryPart[], spot: Spot, step: 1 | -1): Spot | null {
  if (step < 0) {
    if (spot.char > 0) return { at: spot.at, char: isPill(list[spot.at]) ? 0 : spot.char - 1 };
    const at = spot.at - 1;
    if (at < 0) return null;
    return { at, char: isPill(list[at]) ? 0 : Math.max(list[at].raw.length - 1, 0) };
  }
  if (spot.char < list[spot.at].raw.length) return { at: spot.at, char: isPill(list[spot.at]) ? list[spot.at].raw.length : spot.char + 1 };
  const at = spot.at + 1;
  if (at >= list.length) return null;
  return { at, char: isPill(list[at]) ? list[at].raw.length : Math.min(1, list[at].raw.length) };
}

// How much of the item at `at` a selection covers: the characters it reaches,
// or nothing at all. The items between its ends are covered whole.
function coverage(sel: Selection | null, at: number, raw: string): [number, number] | null {
  if (!sel || at < sel.lo.at || at > sel.hi.at) return null;
  const from = at === sel.lo.at ? sel.lo.char : 0;
  const to = at === sel.hi.at ? sel.hi.char : raw.length;
  return to > from ? [from, to] : null;
}

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
// The field's name is shown in the page's language; the query keeps "tag:".
function termLabel(part: TermPart, t: Translator) {
  if (part.field === 'user') return { field: null, value: `@${part.value.replace(/^@+/, '')}` };
  // A list of pin ids says nothing to read; how many there are does.
  if (part.field === 'pin') {
    const count = part.value.split(',').filter((id) => id.trim()).length;
    return { field: null, value: t('search.pinCount', { count }) };
  }
  // tag:, category: and confidence: name the site's own words - a category,
  // or one of the reserved filters - which are read in the page's language;
  // any other value is shown as it was typed.
  const named = part.field === 'tag' || part.field === 'category' || part.field === 'confidence';
  const name = part.field === 'confidence' ? (reservedName('confidence', part.value) ?? part.value) : part.value;
  return { field: t.dynamic(`search.fields.${part.field}`, part.field), value: named ? tagLabel(t, { name }) : part.value };
}

// One row of the suggestions: a category or other tag to filter by (both
// tag: terms), one of the site's own filters (RESERVED_TAGS, which writes its
// own term), or a pin's title to search for.
type Suggestion =
  | { kind: 'category'; name: string; count: number }
  | { kind: 'reserved'; name: string; filter: ReservedTag }
  | { kind: 'tag'; name: string; count: number }
  | { kind: 'pin'; pin: PinJson };

type AutocompleteJson = { pins?: PinJson[]; tags?: TagCount[] };

// The rows in the order they show: categories, then the site's own filters
// and the tags people wrote (one group, the site's first), then pins.
function toSuggestions(res: AutocompleteJson): Suggestion[] {
  const tags = res.tags || [];
  return [
    ...tags.filter((t) => t.kind === 'category').map((c): Suggestion => ({ kind: 'category', name: canonicalCategory(c.name), count: c.count })),
    ...tags.flatMap((t): Suggestion[] => {
      const filter = t.kind === 'reserved' ? reservedTag(t.name) : undefined;
      return filter ? [{ kind: 'reserved', name: filter.name, filter }] : [];
    }),
    ...tags.filter((t) => t.kind !== 'category' && t.kind !== 'reserved').map((t): Suggestion => ({ kind: 'tag', name: t.name, count: t.count })),
    ...(res.pins || []).map((pin): Suggestion => ({ kind: 'pin', pin })),
  ];
}

// A site filter is a tag as far as the list reads, so it sits under the same
// heading as the tags rather than a group of one.
const GROUP_LABEL = {
  category: 'search.groupCategories',
  reserved: 'search.groupTags',
  tag: 'search.groupTags',
  pin: 'search.groupPins',
} as const satisfies Record<Suggestion['kind'], MessageKey>;

// The navbar search: suggestions (matching categories, tags and titles) as you type, Enter to search, and a
// Watched-only toggle for signed-in users (lg and up; below, it is in the drawer). The query sits in the box as items:
// label terms (user:, company:, tag:, @name) as pills and free text as
// plain runs. The text field only ever holds the one item being edited -
// clicking an item opens just that one, in its place, and leaving it (or
// opening another) puts what was typed back as items. Otherwise the field
// waits after the items for something new.
// How long the typing has to pause before suggestions are asked for.
const SUGGEST_DELAY_MS = 150;

// Holding one of these is not yet a key press, so a selected query survives
// until the key it is held for arrives.
const MODIFIERS = new Set(['Meta', 'Control', 'Shift', 'Alt', 'CapsLock']);

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { isLoggedIn } = useSession();
  const timeZone = useTimeZone('UTC');
  const t = useT();

  // The map searches its own pins; everywhere else a search opens /search.
  const onMap = pathname === '/map';
  const urlQuery = pathname === '/search' || onMap ? params.get('q') || '' : '';
  const urlChoice = pathname === '/search' || onMap ? params.get('f') || '' : '';
  const [items, setItems] = useState(() => toItems(urlQuery));
  // The text field's position among the items, and what it holds.
  const [editAt, setEditAt] = useState(() => toItems(urlQuery).length);
  const [draft, setDraft] = useState('');
  // Whether the field holds a pill opened from the box: it is shaded, as the
  // raw term it now shows looks nothing like the pill it was. A run of plain
  // text reads the same open or closed, so it is left alone.
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(urlChoice);
  const watchedOnly = choice === WATCHED;
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // What a drag through the box has selected, if anything. A selection that
  // reaches past the field cannot be the browser's own - the query is items,
  // not one run of text - so the box keeps it and draws it itself. It only
  // ever stands while the field is empty and the items hold the whole query,
  // which is what makes both its ends places among the items.
  const [range, setRange] = useState<{ anchor: Spot; focus: Spot } | null>(null);
  const sel = range && ordered(range.anchor, range.focus);
  const requestId = useRef(0);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const boxRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  // Where to put the caret once the field has moved to the item it opened.
  const pendingCaret = useRef<number | null>(null);
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);
  // Whether the mouse is down on a selection, how to stop following it (also
  // if the box goes while the button is down), and whether the press that
  // ends turned into a drag, whose click opens nothing.
  const dragging = useRef(false);
  const endDrag = useRef<() => void>(() => {});
  const suppressClick = useRef(false);
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

  // Whether the field waits after the items, rather than standing among them
  // in the place of one.
  const trailing = editAt >= items.length;

  // Where an item stands once the field has given its text back to them. A
  // selection is kept in these places rather than in the items as they are
  // drawn, so that its ends still mean the same once the field lets go.
  const drafted = toItems(draft).length;
  const spotOf = (index: number) => (index < editAt ? index : index + drafted);

  // Measures text as `el` draws it. The font is read once, so hunting for the
  // character under a pointer does not ask for the computed style per letter.
  function measure(el: HTMLElement) {
    const context = (measureRef.current ??= document.createElement('canvas').getContext('2d'));
    const style = getComputedStyle(el);
    // Some browsers leave the shorthand empty where it cannot hold every part
    // of the font, and a canvas left unset measures in a default nothing like
    // the box's, which would put every caret in the wrong place.
    if (context) context.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return (text: string) => (context ? context.measureText(text).width : text.length * 8);
  }

  // How wide text is in the field's font.
  function textWidth(el: HTMLElement, text: string) {
    return measure(el)(text);
  }

  // The place in `text` a pointer at `x` points at, as `el` draws it. The
  // width of a prefix only grows, so the hunt stops as soon as it turns away.
  function caretAt(el: HTMLElement, text: string, x: number) {
    const width = measure(el);
    const left = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft);
    let best = 0;
    let closest = Infinity;
    for (let at = 0; at <= text.length; at++) {
      const gap = Math.abs(left + width(text.slice(0, at)) - x);
      if (gap >= closest) break;
      closest = gap;
      best = at;
    }
    return best;
  }

  // The place in the query a pointer at `x` points at, hunted through the
  // items as they are drawn. Past either end it is that end. The items carry
  // the place they stand in, so the answer holds whether the field is open
  // among them or not.
  function spotAt(x: number): Spot | null {
    const nodes = [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-at]') ?? [])];
    if (!nodes.length) return null;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (x > rect.right) continue;
      const at = Number(node.dataset.at);
      const raw = node.dataset.raw ?? '';
      // Short of it: the place in front of it.
      if (x < rect.left) return { at, char: 0 };
      // A pill goes whole, so a pointer within one takes the nearer side.
      if (node.dataset.pill !== undefined) return { at, char: x < rect.left + rect.width / 2 ? 0 : raw.length };
      return { at, char: caretAt(node, raw, x) };
    }
    const last = nodes[nodes.length - 1];
    return { at: Number(last.dataset.at), char: (last.dataset.raw ?? '').length };
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
    // Always a couple of pixels over its text, for the caret: a browser does
    // not paint one where the field has no room for it. Among the items those
    // pixels are taken back in the margin, so that the field stands in exactly
    // the space of the item it replaces and nothing moves as the caret travels.
    const width = textWidth(input, draft || input.placeholder) + padding + 2;
    input.style.width = trailing ? `${Math.ceil(width)}px` : `${width}px`;
    const key = `${draft}|${editAt}|${editing}`;
    if (key !== sizedFor.current && document.activeElement === input && !dragging.current) revealCaret();
    sizedFor.current = key;
  });

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingCaret.current == null || !input) return;
    input.focus();
    input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    if (!dragging.current) revealCaret();
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

  // A pause waiting to be asked about does not outlive the box, nor does a
  // drag still following the mouse.
  useEffect(() => () => clearTimeout(suggestTimer.current), []);
  useEffect(() => () => endDrag.current(), []);

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

  // widen: a filter was taken off, so the timeline or search stays on the
  // same date rather than opening on today.
  function submit(q: string, filter = choice, widen = false) {
    closeSuggestions();
    const href = searchHref(onMap, q, filter);
    router.push(widen ? hrefKeepingDate(href) : href);
  }

  function suggest(value: string) {
    setDraft(value);
    setActive(-1);
    setRange(null);
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
        const res = await api.get<AutocompleteJson>(`/api/pins/autocomplete?q=${encodeURIComponent(value)}`);
        if (id === requestId.current) {
          const next = toSuggestions(res);
          setSuggestions(next);
          setOpen(next.length > 0);
        }
      } catch {
        // suggestions are optional
      }
    }, SUGGEST_DELAY_MS);
  }

  // Searches for a picked suggestion: a category or tag takes the typed text's
  // place as a tag: term (once), a site filter as the term it stands for
  // (confidence:estimated), a pin's title as text.
  function pick(suggestion: Suggestion) {
    if (suggestion.kind === 'pin') {
      setDraft(suggestion.pin.title);
      submit(query(suggestion.pin.title));
      return;
    }
    const { field, value } = suggestion.kind === 'reserved' ? suggestion.filter : { field: 'tag' as const, value: suggestion.name };
    const rest = query('');
    submit(hasTerm(rest, field, value) ? rest : query(term(field, value)));
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
    setRange(null);
    closeSuggestions();
    pendingCaret.current = caret;
  }

  // Opens one item for editing, in its place, closing any other. The caret
  // lands at the end of it unless asked for somewhere else.
  function editItem(index: number, caret?: number) {
    const added = toItems(draft);
    const all = committed();
    const target = index >= editAt ? index + added.length : index;
    const raw = all[target].raw;
    setItems(all.filter((_, i) => i !== target));
    setEditAt(target);
    setDraft(raw);
    setEditing(isPill(all[target]));
    setRange(null);
    closeSuggestions();
    pendingCaret.current = caret ?? raw.length;
  }

  // Follows the mouse until it is let go, selecting from `anchor`. `native`
  // answers whether the pointer is still within the open field, where the
  // browser's own selection does the work and nothing here has to. The moment
  // the drag reaches another item the field gives its text back to `all` -
  // the query as one list - and the box takes the selection over, as no
  // selection of the browser's can leave the field it started in.
  function beginDrag(anchor: Spot, all: QueryPart[], at: number, native?: (x: number) => boolean, emulate = true) {
    // A press is a new drag, even if the last one's release was lost (let go
    // of outside the window), and nothing is a drag until the mouse moves.
    endDrag.current();
    dragging.current = true;
    suppressClick.current = false;
    let spanning = false;
    const follow = (move: MouseEvent) => {
      const field = inputRef.current;
      if (!dragging.current) return;
      if (!spanning && field && native?.(move.clientX)) {
        if (emulate) {
          const to = caretAt(field, field.value, move.clientX);
          field.setSelectionRange(Math.min(anchor.char, to), Math.max(anchor.char, to), to < anchor.char ? 'backward' : 'forward');
        }
        return;
      }
      const focus = spotAt(move.clientX);
      if (!focus) return;
      if (!spanning) {
        // Still where it started: a press, not yet a drag.
        if (!compareSpots(anchor, focus)) return;
        spanning = true;
        // The press that let go of this drag opens nothing.
        suppressClick.current = true;
        setItems(all);
        setDraft('');
        setEditing(false);
        setEditAt(at);
        closeSuggestions();
        // Wherever it lands among the items the field is a new one, and the
        // keys that act on a selection have to be put back into it.
        pendingCaret.current = 0;
      }
      setRange({ anchor, focus });
    };
    const stop = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', follow);
      document.removeEventListener('mouseup', stop);
    };
    endDrag.current = stop;
    document.addEventListener('mousemove', follow);
    document.addEventListener('mouseup', stop);
  }

  // Pressing a run of text: the caret lands on the character pressed, and a
  // drag from there selects as it would in any text box. The run is a button,
  // not text the browser can select, so the field it opens into takes the
  // drag over: it holds the same text, in the same font, in the same place.
  function dragText(index: number, event: React.MouseEvent<HTMLElement>) {
    const all = committed();
    const at = spotOf(index);
    const from = caretAt(event.currentTarget, items[index].raw, event.clientX);
    editItem(index, from);
    beginDrag({ at, char: from }, all, at, (x) => {
      const rect = inputRef.current?.getBoundingClientRect();
      return !!rect && x >= rect.left && x <= rect.right;
    });
  }

  // Where the field's caret stands among the items once it has given its text
  // back: within the one item that text reads as, or else the edge it waits
  // at. `all` must not be empty.
  function fieldSpot(all: QueryPart[], char: number): Spot {
    if (drafted === 1) return { at: editAt, char };
    if (editAt + drafted < all.length) return { at: editAt + drafted, char: 0 };
    return { at: all.length - 1, char: all[all.length - 1].raw.length };
  }

  // The query a selection covers, read off the items it reaches.
  function rangeText(range: Selection) {
    const raws: string[] = [];
    for (let at = range.lo.at; at <= range.hi.at; at++) {
      const raw = items[at].raw;
      raws.push(raw.slice(at === range.lo.at ? range.lo.char : 0, at === range.hi.at ? range.hi.char : raw.length));
    }
    return joinSearchQuery(raws.map((raw) => ({ kind: 'text', raw })));
  }

  // Selects the whole query, items and all. The field gives its text back
  // first, so that the selection has items either side to stand between.
  function selectAll() {
    const all = committed();
    if (!all.length) return;
    setItems(all);
    setDraft('');
    setEditing(false);
    setEditAt(Math.min(editAt + drafted, all.length));
    setRange({ anchor: { at: 0, char: 0 }, focus: { at: all.length - 1, char: all[all.length - 1].raw.length } });
    closeSuggestions();
  }

  // Takes a selection out of the box, with `typed` put in its place. The
  // field takes the cut's own place, so that what is typed next carries on
  // from there: cut out of the middle of one run it holds the two ends, which
  // close up as they would in any text box; cut across items it holds what is
  // left of the first, and what is left of the last stays the run it was.
  function cutRange(range: Selection, typed = '') {
    const within = range.lo.at === range.hi.at;
    const head = items[range.lo.at].raw.slice(0, range.lo.char);
    const tail = items[range.hi.at].raw.slice(range.hi.char);
    const kept = within || !tail ? [] : [{ kind: 'text', raw: tail } as QueryPart];
    setItems([...items.slice(0, range.lo.at), ...kept, ...items.slice(range.hi.at + 1)]);
    setEditAt(range.lo.at);
    setEditing(false);
    setRange(null);
    const text = head + typed + (within ? tail : '');
    if (typed) suggest(text);
    else {
      setDraft(text);
      closeSuggestions();
    }
    // The field has moved out from among the items it stood in, so it is a
    // new one the caret has to be put back into, at the cut.
    pendingCaret.current = head.length + typed.length;
  }

  // Takes an item out of the box and leaves the field where it stands. The
  // search waits for Enter, as it does for anything else typed here; the pill's
  // own × is the press that searches at once.
  function dropItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
    if (index < editAt) setEditAt(editAt - 1);
    closeSuggestions();
    // The field moves up a place as the item goes, so it is a new one that the
    // caret has to be put back into.
    pendingCaret.current = 0;
  }

  function removeItem(index: number) {
    const rest = items.filter((_, i) => i !== index);
    setItems(rest);
    if (index < editAt) setEditAt(editAt - 1);
    submit(joinSearchQuery(committed(draft, rest, index < editAt ? editAt - 1 : editAt)), choice, !draft.trim());
  }

  const input = (
    <input
      ref={inputRef}
      id="site-search"
      type="search"
      name="q"
      autoComplete="off"
      placeholder={items.length ? '' : t('search.placeholder')}
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
      // A copy or cut from the context menu, when the field does hold text:
      // it takes the whole query rather than that text. The keys are caught in
      // onKeyDown instead, as the field is usually empty and a browser raises
      // neither event with nothing of its own selected.
      onCopy={(event) => {
        if (!sel) return;
        event.preventDefault();
        event.clipboardData.setData('text/plain', rangeText(sel));
      }}
      onCut={(event) => {
        if (!sel) return;
        event.preventDefault();
        event.clipboardData.setData('text/plain', rangeText(sel));
        cutRange(sel);
      }}
      onKeyDown={(event) => {
        const field = event.currentTarget;
        const key = event.key.toLowerCase();
        const chord = event.metaKey || event.ctrlKey;
        const atStart = field.selectionStart === 0 && field.selectionEnd === 0;
        const atEnd = field.selectionStart === draft.length && field.selectionEnd === draft.length;

        // Ctrl/Cmd+A selects the query either side of the field too. With
        // nothing but text in the box the browser's own select-all is it.
        if (chord && key === 'a' && items.length) {
          event.preventDefault();
          selectAll();
          return;
        }
        // Copy or cut of a selected part of the query.
        if (sel && chord && (key === 'c' || key === 'x')) {
          event.preventDefault();
          void navigator.clipboard?.writeText(rangeText(sel)).catch(() => {});
          if (key === 'x') cutRange(sel);
          return;
        }
        // Shift and an arrow reach a selection out of the field and on
        // through the items, a place at a time, from the end it is fixed at.
        // Within the field's own text the browser still does it.
        if (event.shiftKey && !chord && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          const step = event.key === 'ArrowLeft' ? -1 : 1;
          if (range) {
            const next = stepSpot(items, range.focus, step);
            if (!next) return;
            event.preventDefault();
            setRange({ anchor: range.anchor, focus: next });
            return;
          }
          const start = field.selectionStart ?? 0;
          const end = field.selectionEnd ?? 0;
          const backward = field.selectionDirection === 'backward';
          // Only once it has reached the side it is heading for, and would
          // have to leave the field to go any further.
          if (step < 0 ? start > 0 || (start !== end && !backward) : end < draft.length || (start !== end && backward)) return;
          const all = committed();
          if (!all.length) return;
          event.preventDefault();
          // The field gives its text back, and what it was fixed at becomes a
          // place among the items: within its own text where the draft is the
          // one item it reads as, and otherwise the edge it stood at.
          const anchor = fieldSpot(all, backward ? end : start);
          // It carries on from the side the field's own selection had already
          // reached, rather than starting the reach over from the fixed end.
          const reached = fieldSpot(all, backward ? start : end);
          const next = stepSpot(all, reached, step);
          if (!next) return;
          setItems(all);
          setDraft('');
          setEditing(false);
          setEditAt(Math.min(editAt + drafted, all.length));
          setRange({ anchor, focus: next });
          closeSuggestions();
          // The field is a new one wherever it lands, and the keys that act
          // on the selection have to be put back into it.
          pendingCaret.current = 0;
          return;
        }
        // With part of the query selected, a key that would replace the
        // field's text replaces all of that instead, items and all; any other
        // key gives the selection up. The cut is made here rather than left
        // to the browser: what is selected is mostly not the field's own text.
        if (sel && !MODIFIERS.has(event.key)) {
          setRange(null);
          if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            cutRange(sel);
            return;
          }
          if (event.key.length === 1 && !chord && !event.altKey) {
            event.preventDefault();
            cutRange(sel, event.key);
            return;
          }
          // Left and right put the caret at the end of the selection they
          // leave, as they do in any text box: part way into a run, the run
          // opens there; at either side of one, the field stands beside it.
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const end = event.key === 'ArrowLeft' ? sel.lo : sel.hi;
            const raw = items[end.at].raw;
            if (end.char > 0 && end.char < raw.length) editItem(end.at, end.char);
            else {
              setEditAt(end.char ? Math.min(end.at + 1, items.length) : end.at);
              pendingCaret.current = 0;
            }
            return;
          }
        }
        // Backspace at the start of an empty field takes the one thing before
        // it: a pill goes whole, while a run of text opens so that the next
        // press carries on through its characters.
        if (event.key === 'Backspace' && !draft && editAt > 0) {
          event.preventDefault();
          if (isPill(items[editAt - 1])) dropItem(editAt - 1);
          else editItem(editAt - 1);
          return;
        }
        // The caret walks the items as well as the text in the field, so the
        // whole query is reachable without the mouse, and Home/End go to
        // either end of it. A pill is one thing, so the caret steps over it;
        // a run of text opens where the caret enters it and is read character
        // by character, as text anywhere else is.
        if ((event.key === 'ArrowLeft' || event.key === 'Home') && atStart && editAt > 0) {
          event.preventDefault();
          const before = items[editAt - 1];
          if (event.key === 'Home') moveField(0, '', 0);
          else if (isPill(before)) moveField(editAt - 1, '', 0);
          else editItem(editAt - 1, before.raw.length - 1);
          return;
        }
        if ((event.key === 'ArrowRight' || event.key === 'End') && atEnd && editAt < items.length) {
          event.preventDefault();
          const after = items[editAt];
          if (event.key === 'End') moveField(Number.MAX_SAFE_INTEGER, '', 0);
          else if (isPill(after)) moveField(editAt + 1, '', 0);
          else editItem(editAt, 1);
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
      // As wide as its text (set above), never narrower; waiting after the
      // items it also takes whatever of the row is left, and room after the
      // text so it is not up against the clear button. Among them it pulls
      // itself into the gap it stands in, holding an empty field's own width
      // and, with text, the two pixels it keeps for the caret. An opened pill
      // is shaded, and keeps to its own width so the shading reads as the
      // pill.
      className={`shrink-0 text-sm text-ink placeholder:text-subtle focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden ${sel ? 'caret-transparent' : ''} ${
        trailing && !editing ? 'min-w-[5rem] grow' : ''
      } ${editing ? 'h-7 rounded-md bg-raised px-1.5' : `h-9 bg-transparent ${trailing ? 'pr-2' : draft ? 'px-0.5 -mr-[2px]' : 'px-0.5 -mx-1.5'}`}`}
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
        if (active >= 0) pick(suggestions[active]);
        else submit(query());
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        {t('search.placeholder')}
      </label>
      <div
        className="relative flex min-w-0 flex-1 cursor-text items-center rounded-full bg-field text-muted ring-1 ring-line transition-shadow ring-inset focus-within:ring-2 focus-within:ring-link"
        // A press on the box itself, not an item or button, types something new
        // after the items.
        onMouseDown={(event) => {
          setRange(null);
          if ((event.target as Element).closest('button')) return;
          const pressed = inputRef.current;
          if (event.target === pressed && pressed) {
            // The browser puts the caret and selects within the field's own
            // text. The drag is followed all the same, so that reaching out
            // of the field carries the selection on through the items.
            const all = committed();
            if (all.length) {
              const bounds = () => pressed.getBoundingClientRect();
              beginDrag(
                fieldSpot(all, caretAt(pressed, pressed.value, event.clientX)),
                all,
                Math.min(editAt + drafted, all.length),
                (x) => x >= bounds().left && x <= bounds().right,
                false,
              );
            }
            return;
          }
          event.preventDefault();
          const all = committed();
          const moving = editAt < items.length;
          if (moving) moveField(Number.MAX_SAFE_INTEGER, '', 0);
          else inputRef.current?.focus();
          const field = inputRef.current;
          // Nothing in the box but the field's own text: the caret goes to
          // the character nearest the press and the selection follows the
          // mouse from there, as it would had the press landed on the field.
          // The whole box is the field's, so the drag never leaves it.
          if (field && !items.length) {
            const char = caretAt(field, field.value, event.clientX);
            field.setSelectionRange(char, char);
            beginDrag({ at: 0, char }, all, 0, () => true);
            return;
          }
          const anchor = spotAt(event.clientX);
          if (anchor) beginDrag(anchor, all, moving ? all.length : editAt + drafted);
        }}
      >
        <Icon name="search" className="ml-3 size-4 shrink-0 text-subtle" />
        <div
          ref={rowRef}
          // gap-1.5: room for the caret to stand between two items without
          // pushing them apart, as the field pulls itself into that gap.
          className="flex h-9 min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain pl-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => {
            // Pressing an item must not blur the field first: that would move
            // the field before this item opens.
            const keepFocus = (event: React.MouseEvent) => event.preventDefault();
            // Where this item stands in the query, and what a selection
            // covers of it. whitespace-pre: a run is split at the selection,
            // and its spaces have to survive the split whole.
            const at = spotOf(index);
            const picked = coverage(sel, at, item.raw);
            let node;
            if (!isPill(item)) {
              node = (
                <button
                  type="button"
                  data-at={at}
                  data-raw={item.raw}
                  aria-label={t('search.editItem', { name: item.raw })}
                  onMouseDown={(event) => {
                    if (event.button !== 0) return;
                    keepFocus(event);
                    dragText(index, event);
                  }}
                  // The mouse already opened the run, at the character it
                  // pressed; this is the keyboard's press (detail 0), which
                  // opens it at the end.
                  onClick={(event) => {
                    if (!event.detail) editItem(index);
                  }}
                  className="shrink-0 rounded px-0.5 text-sm whitespace-pre text-ink hover:bg-raised max-lg:text-base"
                >
                  {picked ? (
                    <>
                      {item.raw.slice(0, picked[0])}
                      <span className="rounded-[2px] bg-accent/55 text-white">{item.raw.slice(picked[0], picked[1])}</span>
                      {item.raw.slice(picked[1])}
                    </>
                  ) : (
                    item.raw
                  )}
                </button>
              );
            } else {
              const { field, value } = termLabel(item, t);
              const name = `${field ? `${field} ` : ''}${value}`;
              node = (
                <span data-at={at} data-raw={item.raw} data-pill="" className={`inline-flex shrink-0 items-center rounded-full text-xs font-medium whitespace-nowrap ring-1 ring-inset ${picked ? 'bg-accent/55 text-white ring-accent' : 'bg-accent/15 text-link ring-accent/60'}`}>
                  <button
                    type="button"
                    title={t('common.edit')}
                    aria-label={t('search.editItem', { name })}
                    // A pill goes whole, so a drag from one selects it and
                    // whatever else it reaches; a press that stays put opens
                    // it, as it always did.
                    onMouseDown={(event) => {
                      if (event.button !== 0) return;
                      keepFocus(event);
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const all = committed();
                      beginDrag({ at, char: event.clientX < bounds.left + bounds.width / 2 ? 0 : item.raw.length }, all, Math.min(editAt + drafted, all.length));
                    }}
                    onClick={() => {
                      if (suppressClick.current) suppressClick.current = false;
                      else editItem(index);
                    }}
                    className="flex items-center gap-1 py-0.5 pl-2"
                  >
                    {field ? <span className={picked ? 'text-white/75' : 'text-subtle'}>{field}</span> : null}
                    <span>{value}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={t('search.removeItem', { name })}
                    onMouseDown={keepFocus}
                    onClick={() => removeItem(index)}
                    className={`mx-0.5 rounded-full p-0.5 hover:bg-raised hover:text-ink ${picked ? 'text-white/75' : 'text-subtle'}`}
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
          {trailing ? input : null}
        </div>
        {draft || items.length ? (
          <button
            type="button"
            className="mr-1.5 rounded-full p-1.5 text-subtle hover:bg-raised hover:text-ink"
            aria-label={t('search.clear')}
            onClick={() => {
              setItems([]);
              setEditAt(0);
              setDraft('');
              setEditing(false);
              closeSuggestions();
              router.push(onMap ? '/map' : hrefKeepingDate('/'));
            }}
          >
            <Icon name="close" className="size-3.5" />
          </button>
        ) : null}
      </div>

      {isLoggedIn ? (
        <button
          type="button"
          // Put out of reach with the rest of the navbar while the big tag cloud is open.
          data-cloud-dim
          aria-pressed={watchedOnly}
          title={watchedOnly ? t('search.watchedOnTitle') : t('search.watchedOffTitle')}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 transition-colors ring-inset max-lg:hidden ${
            watchedOnly ? 'bg-accent/15 text-link ring-accent/60' : 'bg-field text-muted ring-line hover:bg-raised hover:text-ink'
          }`}
          onClick={() => {
            const next = watchedOnly ? '' : WATCHED;
            setChoice(next);
            submit(query(), next, !next);
          }}
        >
          <Icon name="eye" className="size-4" />
          {t('search.watched')}
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
          {suggestions.map((suggestion, index) => {
            const key = suggestion.kind === 'pin' ? `pin:${suggestion.pin.id}` : `${suggestion.kind}:${suggestion.name}`;
            const header = index === 0 || GROUP_LABEL[suggestions[index - 1].kind] !== GROUP_LABEL[suggestion.kind];
            return (
              <Fragment key={key}>
                {header ? (
                  <li role="presentation" className={`px-3 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase ${index ? 'pt-2.5' : 'pt-1'}`}>
                    {t(GROUP_LABEL[suggestion.kind])}
                  </li>
                ) : null}
                <li
                  role="option"
                  aria-selected={index === active}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm ${index === active ? 'bg-raised' : ''}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(suggestion);
                  }}
                >
                  {suggestion.kind === 'pin' ? (
                    <>
                      <Icon name="search" className="mt-0.5 size-3.5 shrink-0 text-faint" />
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-ink sm:line-clamp-1">{suggestion.pin.title}</span>
                        <span className="block text-xs text-subtle">{formatStart(suggestion.pin, timeZone, {}, t.locale)}</span>
                      </span>
                    </>
                  ) : suggestion.kind === 'reserved' ? (
                    // The site's own filter: outlined as in the tag cloud's
                    // strip, and ending in the term it writes rather than a
                    // count, which says both that it is the site's and what
                    // it will do.
                    <>
                      <Icon name={suggestion.filter.icon} className="mt-0.5 size-3.5 shrink-0 text-faint" />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="rounded-full border border-dashed border-line px-2 py-0.5 text-ink">{tagLabel(t, { name: suggestion.name, kind: 'reserved' })}</span>
                      </span>
                      <span className="shrink-0 text-xs text-subtle">
                        {suggestion.filter.field}:{suggestion.filter.value}
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon name={suggestion.kind === 'tag' ? 'tag' : 'sliders'} className="mt-0.5 size-3.5 shrink-0 text-faint" />
                      <span className="min-w-0 flex-1 truncate text-ink">{suggestion.kind === 'category' ? categoryLabel(t, suggestion.name) : suggestion.name}</span>
                      <span className="shrink-0 text-xs text-subtle tabular-nums">{suggestion.count}</span>
                    </>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>
      ) : null}
    </form>
  );
}
