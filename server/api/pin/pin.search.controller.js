'use strict';

import * as response from '../response';
import * as searchQuery from '../../util/searchQuery';
//import * as fp from 'lodash/fp';

import {
  Pins,
  SearchPins,
  SearchPin
} from '../../model';

// Listening to pin events

export function emit(event, pin, options) {
  switch (event) {
    case "search:save":
    case "search:update":
      upsertPin(pin);
      break;
    case "search:remove":
      deletePin(pin);
      break;
  }
}

export function searchPins(req, res) {
  const user = req.user,
    userId = user && +user.id || 0,
    //pinId = +req.params.id,
    searchText = req.query.q,
    hasFavorite = req.query.f && req.query.f.toLowerCase() == 'watch';

  const query = searchQuery.parseSearchQuery(searchText);
  const favoriteUserId = hasFavorite ? userId : null;

  // Nothing but label terms (user:, company:, category:) - answered by the
  // database directly, which needs no search service.
  if (searchQuery.hasFilters(query) && !query.text) {
    return SearchPins.searchFilters(query, favoriteUserId)
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  }

  // Free text, optionally narrowed by label terms. Only the free text goes to
  // the search service - it would read "company:Apple" as words to match.
  return (hasFavorite
    ? SearchPins.searchFavorite(userId, query.text)
    : SearchPins.search(query.text))
    .then(pins => {
      if (searchQuery.hasFilters(query)) {
        pins.pins = pins.pins.filter(pin => searchQuery.matchesFilters(query, pin));
        pins.queryCount = pins.pins.length;
      }
      return pins;
    })
    .then(response.withResult(res, 200))
    .catch(response.handleError(res));
}

export function autocompletePins(req, res) {
  const searchText = req.query.q;

  return SearchPins.querySearchPin(searchText, searchText)
    .then(response.withResult(res, 200))
    .catch(response.handleError(res));
}

export function upsertPin(pin) {
  return new SearchPin(pin).save();
}

export function deletePin(pin) {
  return new SearchPin(pin).delete();
}