// Data for server-rendered pages, cached with Cache Components. Every function
// here returns plain JSON (no model instances), keyed by its arguments.

import { cacheLife, cacheTag } from 'next/cache';
import Pin from '../model/pin';
import Pins from '../model/pins';
import { toJson, type PinJson, type SearchPage, type TimelinePage } from '@/lib/types';
import { TAGS } from './cache';
import { searchCategoryCounts, searchPins } from './search';
import { getTimeline } from './timeline';
import { resolveCreatedSince, type CreatedQuery } from '../util/createdFilter';

export type TimelineCursor = { fromDateTime?: string | null; lastPinId?: number };

// A timeline page, plus the cursors for the pages either side of it.
export async function timelinePage(
  userId: number,
  cursor: TimelineCursor,
  createdWithin: string | null,
): Promise<TimelinePage & { links: { previous?: string; next?: string } }> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);

  const createdSince = createdWithin ? resolveCreatedSince({ created_within: createdWithin }) : null;
  const pins = await getTimeline({
    userId,
    fromDateTime: cursor.fromDateTime,
    lastPinId: cursor.lastPinId,
    createdSince,
  });
  const range = pins.minMaxDateTimePin();
  const carry = createdSince ? `&created_since=${encodeURIComponent(createdSince.toISOString())}` : '';
  const links = range
    ? {
        previous: `?from_date_time=-${new Date(range.min.utcStartDateTime).toISOString()}&last_pin_id=${range.min.id}${carry}`,
        next: `?from_date_time=${new Date(range.max.utcStartDateTime).toISOString()}&last_pin_id=${range.max.id}${carry}`,
      }
    : {};
  return { ...toJson<TimelinePage>(pins), links };
}

// One pin as its page shows it (no per-viewer fields).
export async function pinById(id: number): Promise<PinJson | null> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  const { pin } = await Pin.queryById(id);
  return pin ? toJson<PinJson>(pin) : null;
}

export async function threadPins(id: number): Promise<PinJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  return toJson<PinJson[]>((await Pins.getThreadPins(id)).pins);
}

// Pins like this one, by semantic search on its title. The search service
// being down just means no suggestions.
export async function relatedPins(id: number, title: string): Promise<PinJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  try {
    const pins = await searchPins(title);
    return toJson<PinJson[]>(pins.pins.filter((p) => p.id !== id)).slice(0, 12);
  } catch {
    return [];
  }
}

export async function searchPage(query: string, userId: number | null, onlyWatched: boolean): Promise<SearchPage & { error?: string }> {
  // Watched results are one person's list and must change the moment they
  // watch or unwatch a pin, so they skip the shared, briefly stale cache.
  return onlyWatched && userId ? runSearch(query, userId, true) : cachedSearch(query, userId);
}

async function cachedSearch(query: string, userId: number | null) {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return runSearch(query, userId, false);
}

async function runSearch(query: string, userId: number | null, onlyWatched: boolean): Promise<SearchPage & { error?: string }> {
  try {
    return toJson<SearchPage>(await searchPins(query, { userId, onlyWatched }));
  } catch (err) {
    return { pins: [], error: (err as Error).message };
  }
}

// Pins per lowercased category for the category filter's pills, under the
// page's other filters: the timeline's posted-within span, or a search's
// other terms, watch choice and span.
export async function timelineCategoryCounts(created: CreatedQuery): Promise<Record<string, number>> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  const rows = await Pins.countTimelineByCategory(resolveCreatedSince(created));
  return Object.fromEntries(rows.map((row) => [row.category || '', row.count]));
}

export async function searchPageCategoryCounts(
  query: string,
  userId: number | null,
  onlyWatched: boolean,
  created: CreatedQuery,
): Promise<Record<string, number>> {
  return onlyWatched && userId ? runCategoryCounts(query, userId, true, created) : cachedCategoryCounts(query, created);
}

// Counts carry no per-viewer fields, so everyone shares one entry.
async function cachedCategoryCounts(query: string, created: CreatedQuery) {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return runCategoryCounts(query, null, false, created);
}

function runCategoryCounts(query: string, userId: number | null, onlyWatched: boolean, created: CreatedQuery) {
  return searchCategoryCounts(query, { userId, onlyWatched, createdSince: resolveCreatedSince(created) });
}

export async function pinComments(id: number) {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  const { default: Comment } = await import('../model/comment');
  return toJson<import('@/lib/types').CommentJson[]>(await Comment.getByPinId(id));
}
