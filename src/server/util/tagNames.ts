import * as db from '../db';
import { tagGroupPatterns } from '@/lib/tags';

// Every distinct tag name, kept in memory for a minute. A tag: term stands for
// the tag plus its years and nominations (tagGroupPatterns), and matching those
// regexes in SQL scanned all of "PinTagCache" for every timeline page (about
// 500 ms a call, 2026-10-18). Matching them here, once, lets the query use the
// name index with a plain = ANY.
const TTL_MS = 60_000;
let names: string[] | null = null;
let loadedAt = 0;
let loading: Promise<void> | null = null;

function refresh() {
  loading ??= (async () => {
    try {
      const rows = await db.query(`SELECT DISTINCT "name"::text AS "name" FROM "PinTagCache"`);
      names = rows.map((row) => String(row.name));
      loadedAt = Date.now();
    } catch {
      // keep the old list, or none: the caller falls back to the regex
    } finally {
      loading = null;
    }
  })();
  return loading;
}

// Warm the cache at the start of a request that filters by tag.
export function warmTagNames() {
  return names && Date.now() - loadedAt < TTL_MS ? Promise.resolve() : refresh();
}

// The exact tag names the group terms stand for, or null while the list has
// never loaded (the caller then falls back to the regex in SQL). A stale list
// is used while it reloads.
export function expandTagGroups(terms: string[]): string[] | null {
  if (!names) {
    void refresh();
    return null;
  }
  if (Date.now() - loadedAt >= TTL_MS) void refresh();
  const patterns = tagGroupPatterns(terms).map((pattern) => new RegExp(pattern, 'i'));
  const found = new Set(terms);
  for (const name of names) {
    if (patterns.some((pattern) => pattern.test(name))) found.add(name);
  }
  return [...found];
}
