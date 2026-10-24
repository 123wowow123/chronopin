// Combined searches (two or more filters, or groups joined with OR) a viewer
// has run, kept in their browser and offered as a row in the tag cloud: the
// most-run first, then the newest. Per viewer only - nothing is sent anywhere.
import { api } from '@/lib/client/api';
import { hasFilters, parseSearchQuery } from '@/server/util/searchQuery';

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

// A query worth keeping: one filter alone is a click away already.
function isCombo(query: string) {
  const parsed = parseSearchQuery(query);
  if (parsed.alternatives) return true;
  return hasFilters(parsed) && query.trim().split(/\s+/).length >= 2;
}

export function recordQuery(query: string) {
  const q = query.trim().replace(/\s+/g, ' ');
  if (!q || !isCombo(q)) return;
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
  if (!q) return;
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
