// Pin search: label terms (user:, company:, category:) are answered by the
// database; free text goes to the FAISS service and label terms then narrow
// its hits.

import type Pins from '../model/pins';
import { SearchPins } from '../model/searchPin';
import User from '../model/user';
import { hasFilters, matchesFilters, parseSearchQuery, type SearchQuery } from '../util/searchQuery';

type SearchOptions = { userId?: number | null; onlyWatched?: boolean };

export async function searchPins(searchText: string, options: SearchOptions = {}) {
  const query = parseSearchQuery(searchText);
  const pins = await findPins(query, options);

  // A search that names exactly one user also answers with that user's id
  // and handle, so the page can show whose pins these are with a Follow
  // button - even when none of them match.
  if (query.userNames.length === 1) {
    const { user } = await User.getUserByUserName(query.userNames[0]);
    if (user) {
      (pins as Pins & { user?: unknown }).user = { id: user.id, userName: user.userName };
    }
  }
  return pins;
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
  const pins = query.text
    ? await findPins(query, options)
    : await SearchPins.searchFilters(query, options.onlyWatched ? options.userId || 0 : null);

  const since = options.createdSince?.getTime();
  const counts: Record<string, number> = {};
  for (const pin of pins.pins) {
    if (since != null && new Date(pin.utcCreatedDateTime).getTime() < since) continue;
    const category = String(pin.category || '').toLowerCase();
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}

async function findPins(query: SearchQuery, options: SearchOptions): Promise<Pins> {
  const userId = options.userId || 0;
  const favoriteUserId = options.onlyWatched ? userId : null;

  if (hasFilters(query) && !query.text) {
    return SearchPins.searchFilters(query, favoriteUserId);
  }
  // Only the free text goes to the search service - it would read
  // "company:Apple" as words to match.
  const pins = options.onlyWatched ? await SearchPins.searchFavorite(userId, query.text) : await SearchPins.search(query.text);
  if (hasFilters(query)) {
    pins.pins = pins.pins.filter((pin) => matchesFilters(query, pin));
    pins.queryCount = pins.pins.length;
  }
  return pins;
}
