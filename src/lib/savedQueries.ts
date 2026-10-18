// Combined searches (two or more filters, or groups joined with OR) a viewer
// has run, kept in their browser and offered as a row in the tag cloud: the
// most-run first, then the newest. Per viewer only - nothing is sent anywhere.
import { api } from '@/lib/client/api';
import { hasFilters, parseSearchQuery } from '@/server/util/searchQuery';

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
