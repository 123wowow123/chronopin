// Combined searches (two or more filters, or groups joined with OR) a viewer
// has run, kept in their browser and offered as a row in the tag cloud: the
// most-run first, then the newest. Per viewer only - nothing is sent anywhere.
import { useSyncExternalStore } from 'react';
import { api } from '@/lib/client/api';
import { hasFilters, joinSearchQuery, LEADING_NAME, wholeGroup, parseSearchQuery, splitSearchQuery } from '@/server/util/searchQuery';

// Fired by the search box while its selected filters are dragged out: { q, x, y, drop } (drop on release).
export const DRAG_QUERY_EVENT = 'chronopin:drag-query';

const KEY = 'chronopin_combo_queries';
const KEEP = 12;

type Saved = { q: string; count: number; last: number };

function read(): Saved[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => s && typeof s.q === 'string') : [];
  } catch {
    return [];
  }
}

// A list of exact pins (pin:1,2,3) is how a batch links to its pins, not a
// search anyone would come back to by its text: it joins the cloud only once
// the viewer has named it (queryNames).
export function isPinList(query: string) {
  return parseSearchQuery(query).ids.length > 0;
}

// A name: term in a query (name:"Veo releases") names the search it is in:
// the query without it, and the name (null when there is none). The last wins.
// A leading [Name] is the same, typed quicker: [Veo]pin:1,2,3.
export function takeName(typed: string): { query: string; name: string | null } {
  const lead = LEADING_NAME.exec(typed);
  const query = lead ? typed.slice(lead[0].length) : typed;
  const bracket = lead ? lead[1].trim().replace(/\s+/g, ' ') : null;
  const taken = takeNameTerm(query);
  // [Hot](...) names the group: a search that is only a group is saved without its brackets.
  return { query: wholeGroup(taken.query) ?? taken.query, name: taken.name ?? (bracket || null) };
}

function takeNameTerm(query: string): { query: string; name: string | null } {
  const parts = splitSearchQuery(query);
  let name: string | null = null;
  for (const part of parts) if (part.kind === 'term' && part.field === 'name' && !part.negated) name = part.value.trim() || name;
  if (!parts.some((part) => part.kind === 'term' && part.field === 'name')) return { query: query.trim(), name: null };
  return { query: joinSearchQuery(parts.filter((part) => !(part.kind === 'term' && part.field === 'name'))), name };
}

// What a named search shows: its name, and for a list of pins the count after a dot ("Google · 24").
export function queryLabel(query: string, name: string) {
  const count = parseSearchQuery(query).ids.length;
  return count ? `${name} · ${count}` : name;
}

// A query worth keeping: one filter alone is a click away already.
function isCombo(query: string) {
  const parsed = parseSearchQuery(query);
  if (parsed.alternatives) return true;
  return hasFilters(parsed) && query.trim().split(/\s+/).length >= 2;
}

export function recordQuery(query: string) {
  const q = query.trim().replace(/\s+/g, ' ');
  if (!q || !isCombo(q) || isPinList(q)) return;
  api.post('/api/pins/popular-queries', { q }).catch(() => {});
  try {
    const list = read();
    const found = list.find((s) => s.q === q);
    if (found) {
      found.count += 1;
      found.last = Date.now();
    } else list.push({ q, count: 1, last: Date.now() });
    list.sort((a, b) => b.count - a.count || b.last - a.last);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, KEEP)));
  } catch {
    // Storage blocked: the row just stays empty.
  }
}

export function savedQueries(): string[] {
  return read().map((s) => s.q);
}

// What everyone has run lately, then this viewer's own, without repeats.
export async function sharedQueries(): Promise<string[]> {
  const popular = await api.get<string[]>('/api/pins/popular-queries').catch(() => [] as string[]);
  return [...new Set([...popular, ...savedQueries()])].slice(0, 16);
}

// Every search this viewer ran (single filters too), newest first. Browser only.
const RECENT_KEY = 'chronopin_recent_queries';
const RECENT_KEEP = 12;

export function recentQueries(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(list) ? list.filter((q) => typeof q === 'string') : [];
  } catch {
    return [];
  }
}

export function recordRecentQuery(query: string) {
  const q = query.trim().replace(/\s+/g, ' ');
  if (!q || isPinList(q)) return;
  try {
    const list = [q, ...recentQueries().filter((x) => x !== q)].slice(0, RECENT_KEEP);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: the row just stays empty.
  }
}

// Searches the viewer pinned to the front of the row, newest pin first.
const PINNED_KEY = 'chronopin_pinned_queries';

export function pinnedQueries(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(PINNED_KEY) || '[]');
    return Array.isArray(list) ? list.filter((q) => typeof q === 'string') : [];
  } catch {
    return [];
  }
}

export function togglePinnedQuery(q: string): string[] {
  const list = pinnedQueries();
  const next = list.includes(q) ? list.filter((x) => x !== q) : [q, ...list];
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the pin just lasts until the cloud closes.
  }
  return next;
}

// Names given to searches, by query text. A named search is shown by its name
// and, a pin: list especially, only joins the row once it has one. Names are
// shared (SavedSearch, 0220): every viewer sees them in the popular searches,
// and only a signed-in user can give one.
const NAMES_EVENT = 'chronopin:query-names';
type Named = { name: string; by: string | null };
let remote: Record<string, Named> = {};
let namesCached: Record<string, string> = {};
const noNames: Record<string, string> = {};

export function queryNames(): Record<string, string> {
  return namesCached;
}

// The @handle of whoever named a search (null when unknown).
export function queryNamedBy(q: string): string | null {
  return remote[q]?.by ?? null;
}

function setRemote(next: Record<string, Named>) {
  remote = next;
  namesCached = Object.fromEntries(Object.entries(next).map(([q, n]) => [q, n.name]));
  window.dispatchEvent(new Event(NAMES_EVENT));
}

// The names as React state, so every pill showing a named search (the search
// box's as well as the cloud's) follows a rename at once.
export function useQueryNames(): Record<string, string> {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener(NAMES_EVENT, notify);
      return () => window.removeEventListener(NAMES_EVENT, notify);
    },
    () => namesCached,
    () => noNames,
  );
}

// An empty name removes it (and a pin list drops out of the row again).
export function saveQueryName(q: string, name: string, by: string | null) {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 60);
  const next = { ...remote };
  if (clean) next[q] = { name: clean, by: remote[q]?.by ?? by };
  else delete next[q];
  setRemote(next);
  api.put('/api/saved-searches', { q, name: clean }).catch(() => syncQueryNames());
}

// Everyone's names from the server.
export async function syncQueryNames() {
  const all = await api.get<Record<string, Named>>('/api/saved-searches').catch(() => null);
  if (all) setRemote(all);
}

// A generated name for a pin: list, or null.
export async function suggestQueryName(q: string): Promise<string | null> {
  const res = await api.get<{ name: string | null }>(`/api/saved-searches?suggest=${encodeURIComponent(q)}`).catch(() => null);
  return res?.name ?? null;
}
