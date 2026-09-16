// Data for server-rendered pages, cached with Cache Components. Every function
// here returns plain JSON (no model instances), keyed by its arguments.

import { cacheLife, cacheTag } from 'next/cache';
import Pin from '../model/pin';
import Pins from '../model/pins';
import { SearchPins } from '../model/searchPin';
import { compareDuplicateRank } from '@/lib/duplicates';
import { toJson, type PinJson, type SearchPage, type TimelinePage } from '@/lib/types';
import { TAGS } from './cache';
import { readSearchRequest, searchCategoryCounts, searchPinsPage, type SearchSort } from './search';
import { getTimeline, timelineMinConfidence } from './timeline';
import { resolveCreatedSince, type CreatedQuery } from '../util/createdFilter';

export type TimelineCursor = { fromDateTime?: string | null; lastPinId?: number };

// hasFavorite and hasLike are the only per-viewer fields a pin carries, and
// they are the reason a cached page used to be keyed by reader: every signed
// in person got a private copy of every cursor, to be told about the handful
// of pins they watch. The cached pages below are built with no viewer and
// drop the fields rather than answer them as false, so a card knows to ask
// (src/lib/client/watched.ts) instead of believing a shared page's no.
const NO_VIEWER = 0;

function withoutViewerState<T extends { pins: PinJson[] }>(page: T): T {
  page.pins.forEach((pin) => {
    delete pin.hasFavorite;
    delete pin.hasLike;
  });
  return page;
}

// A timeline page, plus the cursors for the pages either side of it and the
// confidence bar it was filtered by (null when the filter is off).
export async function timelinePage(
  cursor: TimelineCursor,
  createdWithin: string | null,
): Promise<TimelinePage & { links: { previous?: string; next?: string }; minConfidence: number | null }> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);

  const createdSince = createdWithin ? resolveCreatedSince({ created_within: createdWithin }) : null;
  const [pins, minConfidence] = await Promise.all([
    getTimeline({
      userId: NO_VIEWER,
      fromDateTime: cursor.fromDateTime,
      lastPinId: cursor.lastPinId,
      createdSince,
    }),
    timelineMinConfidence(),
  ]);
  const range = pins.minMaxDateTimePin();
  const carry = createdSince ? `&created_since=${encodeURIComponent(createdSince.toISOString())}` : '';
  const links = range
    ? {
        previous: `?from_date_time=-${new Date(range.min.utcStartDateTime).toISOString()}&last_pin_id=${range.min.id}${carry}`,
        next: `?from_date_time=${new Date(range.max.utcStartDateTime).toISOString()}&last_pin_id=${range.max.id}${carry}`,
      }
    : {};
  return withoutViewerState({ ...toJson<TimelinePage>(pins), links, minConfidence });
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

// The pins in a pin's confirmed duplicate group, itself included, best ranked
// first. Every member's tag is invalidated when the group changes.
export async function duplicateGroupPins(id: number, group: number[]): Promise<PinJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  const pins = toJson<PinJson[]>((await Pins.queryByIds(group)).pins);
  return pins.sort(compareDuplicateRank);
}

// Pins like this one, by semantic search on its title. The search service
// being down just means no suggestions.
export async function relatedPins(id: number, title: string): Promise<PinJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.pin(id));
  try {
    const pins = await SearchPins.search(title);
    return toJson<PinJson[]>(pins.pins.filter((p) => p.id !== id)).slice(0, 12);
  } catch {
    return [];
  }
}

// The sort and filters a search page's URL names: spans as the sliders set them.
export type SearchView = { sort: SearchSort; posted: string | null; past: string | null; future: string | null };

// The first page of a search, and the links on to later ones.
export async function searchPage(query: string, userId: number | null, onlyWatched: boolean, view: SearchView): Promise<SearchPage & { error?: string }> {
  // Watched results are one person's list and must change the moment they
  // watch or unwatch a pin, so they skip the shared, briefly stale cache.
  return onlyWatched && userId ? runSearch(query, userId, true, view) : cachedSearch(query, view);
}

// Built with no viewer, so one entry serves everyone rather than one per
// signed-in reader; the cards ask who watches what.
async function cachedSearch(query: string, view: SearchView) {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  return withoutViewerState(await runSearch(query, NO_VIEWER, false, view));
}

async function runSearch(query: string, userId: number | null, onlyWatched: boolean, view: SearchView): Promise<SearchPage & { error?: string }> {
  const params = new URLSearchParams({ q: query, sort: view.sort });
  if (onlyWatched) params.set('f', 'watch');
  if (view.posted) params.set('created_within', view.posted);
  if (view.past) params.set('start_past', view.past);
  if (view.future) params.set('start_future', view.future);
  try {
    const { pins, links } = await searchPinsPage(readSearchRequest(params, userId));
    return { ...toJson<SearchPage>(pins), links };
  } catch (err) {
    return { pins: [], links: {}, error: (err as Error).message };
  }
}

// Pins per lowercased category for the category filter's pills, under the
// page's other filters: the timeline's posted-within span, or a search's
// other terms, watch choice and span.
export async function timelineCategoryCounts(created: CreatedQuery): Promise<Record<string, number>> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  const rows = await Pins.countTimelineByCategory(resolveCreatedSince(created), await timelineMinConfidence());
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
