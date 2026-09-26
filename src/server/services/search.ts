// Pin search: free text goes to the FAISS service for its best matches, and
// also finds the pins standing in the place it names; label terms (user:,
// company:, confidence:, tag: - and category:, read as tag: - and place:),
// the Watch choice and the time filters narrow them in the database, which
// also pages the results.

import config from '../config';
import Comment from '../model/comment';
import Company from '../model/company';
import CompanyFollow from '../model/companyFollow';
import PinSentiment from '../model/pinSentiment';
import Pins, { type SearchFilter, type SearchRank } from '../model/pins';
import PinView from '../model/pinView';
import ProductPicture from '../model/productPicture';
import { SearchPins } from '../model/searchPin';
import User from '../model/user';
import { HttpError } from '../util/httpError';
import { resolveCreatedSince } from '../util/createdFilter';
import { hasFilters, parseSearchQuery, type SearchQuery } from '../util/searchQuery';
import { timeZoneOrUtc } from '../viewer';
import { commentMood } from '@/lib/commentMood';
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

// Every pin a search matches - for the map, which plots them all, and for a
// caller that named no sort. Free text is ranked by relevance: the semantic
// pool is wide, so ordering it by event date buries the pins that actually
// match under whichever of them happens to be oldest, and a caller reads that
// as no match. A pure label search has nothing to rank by and stays by date.
export async function searchPins(searchText: string, options: SearchOptions = {}) {
  const query = parseSearchQuery(searchText);
  if (asksForNothing(query, options)) return new Pins({ pins: [], queryCount: 0 });
  const filter = await searchFilter(query, options);
  const sort = query.text ? ('relevance' as const) : ('date' as const);
  const pins = await Pins.querySearchRanked(await Pins.rankSearch(filter, { sort, direction: 'next' }, null), options.userId || 0);
  await attachSearchedUser(pins, query);
  return pins;
}

// The request's filters and cursor from its URL parameters. The spans a first
// page names (created_within, start_past, start_future) resolve against now;
// its links carry the resolved instants on, so the window holds still while
// the reader scrolls. Throws a 400 for a value it cannot read.
export function readSearchRequest(params: URLSearchParams, userId: number | null, now = new Date()): SearchRequest {
  // A free-text search answers by relevance unless the caller asks for date;
  // a pure label search (user:, tag:, date:) has nothing to rank by, so it
  // stays in date order. This is the rule the search page already applies
  // (app/[lang]/(timeline)/search/page.tsx) - the API used to default to date
  // whatever the query, so a caller that named no sort got the semantic hits
  // ordered by event date and read the oldest pins in the pool as "no match".
  const asked = params.get('sort');
  const free = !!parseSearchQuery(params.get('q')).text;
  const sort = params.get('q')?.trim() && (asked === 'relevance' || (asked !== 'date' && free)) ? 'relevance' : 'date';
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
  // One row more than a page is asked for, purely to see whether there is
  // another page at all: a page that fills exactly, with nothing after it,
  // would otherwise be linked on from to nothing.
  const probe = size + 1;
  const { cursor } = request;
  const links: SearchLinks = {};
  // Puts the page back to its size, and links on only if that extra row was
  // there - it belongs to the next page, not this one.
  const link = (direction: 'previous' | 'next', ranks: SearchRank[]) => {
    if (ranks.length <= size) return;
    ranks.length = size;
    links[direction] = searchLink(request, direction, ranks[size - 1]);
  };

  let ranked: SearchRank[];
  if (request.sort === 'relevance') {
    const after = cursor ? { id: cursor.id, start: cursor.start, score: cursor.score ?? 1 } : null;
    ranked = await Pins.rankSearch(filter, { sort: 'relevance', after }, probe);
    link('next', ranked);
  } else if (cursor) {
    ranked = await Pins.rankSearch(filter, { sort: 'date', direction: cursor.direction, after: cursor }, probe);
    link(cursor.direction, ranked);
    if (cursor.direction === 'previous') ranked.reverse();
  } else {
    // The first page straddles now, as the timeline's does.
    const now = { start: new Date().toISOString(), id: 0 };
    const [before, after] = await Promise.all([
      Pins.rankSearch(filter, { sort: 'date', direction: 'previous', after: now }, probe),
      Pins.rankSearch(filter, { sort: 'date', direction: 'next', after: now }, probe),
    ]);
    link('previous', before);
    link('next', after);
    ranked = before.reverse().concat(after);
  }

  const pins = await Pins.querySearchRanked(ranked, request.userId || 0);
  if (!cursor) await Promise.all([attachSearchedUser(pins, query), attachSearchedCompany(pins, query)]);
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

// The tag cloud's tags for a search: its results' tags, busiest first, with
// the terms the cloud writes left out, so each tag counts what picking it
// would add. The site's reserved filters are counted too (countReserved).
export async function searchTagCounts(
  searchText: string,
  limit: number,
  options: SearchOptions & { createdSince?: Date | null } = {},
): Promise<TagCount[]> {
  // The cloud counts the pins its own picks would narrow, so it leaves out
  // the terms it writes: the tag: and -tag: ones, and the confidence: levels
  // and bands its reserved filters stand for. Otherwise a pick would zero out
  // every other value of the same field, and a left-out tag would drop off
  // the cloud with no way back.
  const query = { ...parseSearchQuery(searchText), tags: [], excludeTags: [], confidences: [], confidenceBands: [] };
  return Pins.countSearchTags({ ...(await searchFilter(query, options)), createdSince: options.createdSince }, limit);
}

// An empty search (not the Watch list) matches nothing, rather than every pin.
function asksForNothing(query: SearchQuery, options: SearchOptions) {
  return !query.text && !hasFilters(query) && !options.onlyWatched;
}

// Only the free text goes to the search service - it would read
// "company:Apple" as words to match. The text is kept on the filter too:
// the database widens the service's hits with the pins whose address or
// translated title names it (searchClauses).
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

// How many of a company's comments its mood is read from. Plenty for a trend
// and a bounded read however many pins the company has.
const COMPANY_MOOD_COMMENTS = 200;

// A search that names exactly one company answers with that company too: what
// it is in a line, how the comments on its pins read lately, and how many
// people follow it - the panel a company: search opens with. Whether the
// viewer follows it is not here: these results are cached for everyone, so the
// button asks for its own status (CompanyFollowButton).
async function attachSearchedCompany(pins: Pins, query: SearchQuery) {
  if (query.companies.length !== 1) return;
  const company = await Company.byName(query.companies[0]);
  if (!company) return;
  const [comments, follow, pinTones, productPictures] = await Promise.all([
    Comment.forCompany(company.id, COMPANY_MOOD_COMMENTS),
    CompanyFollow.status(company.id, null),
    PinSentiment.forCompany(company.id),
    ProductPicture.forCompany(company.id),
  ]);
  // Pictures only for the pins with a product: each product's row shows one,
  // else the one looked up for it (0079).
  const pictures = await PinView.pictures(pinTones.filter((p) => p.product).map((p) => p.id));
  (pins as Pins & { company?: unknown }).company = {
    id: company.id,
    name: company.name,
    description: company.description,
    logoUrl: company.logoUrl,
    wikiUrl: company.wikiUrl,
    followerCount: follow.followerCount,
    commentCount: comments.length,
    mood: commentMood(comments.map((c) => ({ ...c, utcCreatedDateTime: c.utcCreatedDateTime.toISOString() }))),
    // The graph: how its pins read as news, by when each happens, and how
    // its comments read, by when each was written (src/lib/companySentiment.ts).
    // Each pin's product lets the page graph its major products too.
    sentiment: {
      pins: pinTones.map((p) => ({ id: p.id, title: p.title, at: p.utcStartDateTime.toISOString(), value: p.sentiment, product: p.product, ...pictures.get(p.id) })),
      comments: comments
        .filter((c): c is typeof c & { sentiment: number } => c.sentiment != null)
        .map((c) => ({ at: c.utcCreatedDateTime.toISOString(), value: c.sentiment, pinId: c.pinId }))
        .reverse(),
      productPictures,
    },
  };
}
