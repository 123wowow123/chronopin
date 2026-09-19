// Pin search: free text goes to the FAISS service for its best matches; label
// terms (user:, company:, category:, confidence:, tag:), the Watch choice and the
// time filters narrow them in the database, which also pages the results.

import config from '../config';
import Pins, { type SearchFilter, type SearchRank } from '../model/pins';
import { SearchPins } from '../model/searchPin';
import User from '../model/user';
import { HttpError } from '../util/httpError';
import { resolveCreatedSince } from '../util/createdFilter';
import { hasFilters, parseSearchQuery, type SearchQuery } from '../util/searchQuery';
import { timeZoneOrUtc } from '../viewer';
import { isSpan, offsetDate } from '@/lib/postedSpan';
import type { TagCount } from '@/lib/tags';

// timeZone: the zone date: and posted: days are the viewer's in (UTC when absent).
type SearchOptions = { userId?: number | null; onlyWatched?: boolean; timeZone?: string };

export type SearchSort = 'date' | 'relevance';

// One page of results, as GET /api/pins/search?sort=... reads it.
export type SearchRequest = {
  q: string;
  userId: number | null;
  onlyWatched: boolean;
  sort: SearchSort;
  // The zone date: and posted: days are read in (the tz parameter).
  timeZone: string;
  createdSince: Date | null;
  // When the results start, by relevance only: the timeline shows when.
  startFrom: Date | null;
  startTo: Date | null;
  // Where the page begins: after this pin, walking in direction. Absent, a
  // date page straddles now and a relevance page starts from the best match.
  cursor: { direction: 'next' | 'previous'; start: string; id: number; score: number | null } | null;
};

export type SearchLinks = { previous?: string; next?: string };

// Every pin a search matches, in date order - for the map, which plots them all.
export async function searchPins(searchText: string, options: SearchOptions = {}) {
  const query = parseSearchQuery(searchText);
  if (asksForNothing(query, options)) return new Pins({ pins: [], queryCount: 0 });
  const filter = await searchFilter(query, options);
  const pins = await Pins.querySearchRanked(await Pins.rankSearch(filter, { sort: 'date', direction: 'next' }, null), options.userId || 0);
  await attachSearchedUser(pins, query);
  return pins;
}

// The request's filters and cursor from its URL parameters. The spans a first
// page names (created_within, start_past, start_future) resolve against now;
// its links carry the resolved instants on, so the window holds still while
// the reader scrolls. Throws a 400 for a value it cannot read.
export function readSearchRequest(params: URLSearchParams, userId: number | null, now = new Date()): SearchRequest {
  const sort = params.get('sort') === 'relevance' && params.get('q')?.trim() ? 'relevance' : 'date';
  const createdSince = resolveCreatedSince({ created_since: params.get('created_since'), created_within: params.get('created_within') }, now);

  const fromDateTime = params.get('from_date_time');
  let cursor: SearchRequest['cursor'] = null;
  if (fromDateTime) {
    const previous = fromDateTime.startsWith('-');
    const start = previous ? fromDateTime.slice(1) : fromDateTime;
    const id = Number(params.get('last_pin_id'));
    const score = params.has('after_score') ? Number(params.get('after_score')) : null;
    if (isNaN(new Date(start).getTime()) || !Number.isInteger(id) || (score !== null && !Number.isFinite(score)) || (sort === 'relevance' && score === null)) {
      throw new HttpError(400, 'Invalid search cursor');
    }
    cursor = { direction: previous ? 'previous' : 'next', start, id, score };
  }

  const bound = (instant: string, span: string, signum: number) => {
    const value = params.get(instant);
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) throw new HttpError(400, `${instant} is not a date: '${value}'`);
      return date;
    }
    const within = params.get(span);
    if (!within) return null;
    if (!isSpan(within)) throw new HttpError(400, `${span} is not a span: '${within}'`);
    return offsetDate(now, within, signum);
  };

  return {
    q: params.get('q') || '',
    userId,
    onlyWatched: params.get('f')?.toLowerCase() === 'watch' && !!userId,
    sort,
    timeZone: timeZoneOrUtc(params.get('tz') ?? undefined),
    createdSince,
    startFrom: sort === 'relevance' ? bound('start_from', 'start_past', -1) : null,
    startTo: sort === 'relevance' ? bound('start_to', 'start_future', 1) : null,
    cursor,
  };
}

// A page of search results and the links to the pages either side of it
// (query strings for /api/pins/search). A link is left out when that way has
// no more pins.
export async function searchPinsPage(request: SearchRequest): Promise<{ pins: Pins; links: SearchLinks }> {
  const query = parseSearchQuery(request.q);
  if (asksForNothing(query, request)) return { pins: new Pins({ pins: [], queryCount: 0 }), links: {} };
  const filter = {
    ...(await searchFilter(query, request)),
    createdSince: request.createdSince,
    startFrom: request.startFrom,
    startTo: request.startTo,
  };
  const size = config.pagination.searchPageSize;
  const { cursor } = request;
  const links: SearchLinks = {};
  const link = (direction: 'previous' | 'next', ranks: SearchRank[]) => {
    if (ranks.length === size) links[direction] = searchLink(request, direction, ranks[ranks.length - 1]);
  };

  let ranked: SearchRank[];
  if (request.sort === 'relevance') {
    const after = cursor ? { id: cursor.id, start: cursor.start, score: cursor.score ?? 1 } : null;
    ranked = await Pins.rankSearch(filter, { sort: 'relevance', after }, size);
    link('next', ranked);
  } else if (cursor) {
    ranked = await Pins.rankSearch(filter, { sort: 'date', direction: cursor.direction, after: cursor }, size);
    link(cursor.direction, ranked);
    if (cursor.direction === 'previous') ranked.reverse();
  } else {
    // The first page straddles now, as the timeline's does.
    const now = { start: new Date().toISOString(), id: 0 };
    const [before, after] = await Promise.all([
      Pins.rankSearch(filter, { sort: 'date', direction: 'previous', after: now }, size),
      Pins.rankSearch(filter, { sort: 'date', direction: 'next', after: now }, size),
    ]);
    link('previous', before);
    link('next', after);
    ranked = before.reverse().concat(after);
  }

  const pins = await Pins.querySearchRanked(ranked, request.userId || 0);
  if (!cursor) await attachSearchedUser(pins, query);
  return { pins, links };
}

function searchLink(request: SearchRequest, direction: 'previous' | 'next', last: SearchRank): string {
  const params = new URLSearchParams({ q: request.q, sort: request.sort });
  if (request.onlyWatched) params.set('f', 'watch');
  if (request.timeZone !== 'UTC') params.set('tz', request.timeZone);
  if (request.createdSince) params.set('created_since', request.createdSince.toISOString());
  if (request.startFrom) params.set('start_from', request.startFrom.toISOString());
  if (request.startTo) params.set('start_to', request.startTo.toISOString());
  params.set('from_date_time', `${direction === 'previous' ? '-' : ''}${last.start}`);
  params.set('last_pin_id', String(last.id));
  if (request.sort === 'relevance') params.set('after_score', String(last.score));
  return `?${params.toString()}`;
}

// Pins per lowercased category for the category filter's pills: the search
// with its category: terms left out, so each pill counts what picking it
// would show. With no free text that is every pin the other terms match -
// every live pin (or watched pin) when there are none.
export async function searchCategoryCounts(
  searchText: string,
  options: SearchOptions & { createdSince?: Date | null } = {},
): Promise<Record<string, number>> {
  const query = { ...parseSearchQuery(searchText), categories: [] };
  const rows = await Pins.countSearchByCategory({ ...(await searchFilter(query, options)), createdSince: options.createdSince });
  return Object.fromEntries(rows.map((row) => [row.category || '', row.count]));
}

// The tag cloud's tags for a search: its results' tags, busiest first, with
// its tag: terms left out as the category pills leave out category: ones.
export async function searchTagCounts(
  searchText: string,
  limit: number,
  options: SearchOptions & { createdSince?: Date | null } = {},
): Promise<TagCount[]> {
  const query = { ...parseSearchQuery(searchText), tags: [] };
  return Pins.countSearchTags({ ...(await searchFilter(query, options)), createdSince: options.createdSince }, limit);
}

// An empty search (not the Watch list) matches nothing, rather than every pin.
function asksForNothing(query: SearchQuery, options: SearchOptions) {
  return !query.text && !hasFilters(query) && !options.onlyWatched;
}

// Only the free text goes to the search service - it would read
// "company:Apple" as words to match.
async function searchFilter(query: SearchQuery, options: SearchOptions): Promise<SearchFilter> {
  return {
    ...query,
    hits: query.text ? await SearchPins.hits(query.text) : null,
    favoriteUserId: options.onlyWatched ? options.userId || 0 : null,
    timeZone: timeZoneOrUtc(options.timeZone),
  };
}

// A search that names exactly one user also answers with that user's id and
// handle, so the page can show whose pins these are with a Follow button -
// even when none of them match.
async function attachSearchedUser(pins: Pins, query: SearchQuery) {
  if (query.userNames.length === 1) {
    const { user } = await User.getUserByUserName(query.userNames[0]);
    if (user) {
      (pins as Pins & { user?: unknown }).user = { id: user.id, userName: user.userName };
    }
  }
}
