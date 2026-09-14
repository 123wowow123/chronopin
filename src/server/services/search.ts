// Pin search: label terms (user:, company:, category:) are answered by the
// database; free text goes to the FAISS service and label terms then narrow
// its hits.

import type Pins from '../model/pins';
import { SearchPins } from '../model/searchPin';
import User from '../model/user';
import { hasFilters, matchesFilters, parseSearchQuery } from '../util/searchQuery';

export async function searchPins(searchText: string, options: { userId?: number | null; onlyWatched?: boolean } = {}) {
  const query = parseSearchQuery(searchText);
  const userId = options.userId || 0;
  const favoriteUserId = options.onlyWatched ? userId : null;

  let pins: Pins;
  if (hasFilters(query) && !query.text) {
    pins = await SearchPins.searchFilters(query, favoriteUserId);
  } else {
    // Only the free text goes to the search service - it would read
    // "company:Apple" as words to match.
    pins = options.onlyWatched ? await SearchPins.searchFavorite(userId, query.text) : await SearchPins.search(query.text);
    if (hasFilters(query)) {
      pins.pins = pins.pins.filter((pin) => matchesFilters(query, pin));
      pins.queryCount = pins.pins.length;
    }
  }

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
