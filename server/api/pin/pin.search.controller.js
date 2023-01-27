'use strict';

import * as response from '../response';
//import * as fp from 'lodash/fp';

import {
  Pins,
  SearchPins,
  SearchPin
} from '../../model';

// Listening to pin events

export function emit(event, pin, options) {
  switch (event) {
    case "search:favorite":
      favoritePin(options.userId, pin);
      break;
    case "search:unfavorite":
      unfavoritePin(options.userId, pin);
      break;
    case "search:like":
      likePin(options.userId, pin);
      break;
    case "search:unlike":
      unlikePin(options.userId, pin);
      break;
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

  //console.log('searchPin:', searchText);
  if (hasFavorite) {
    return SearchPins.searchFavorite(userId, searchText)
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  } else {
    return SearchPins.search(userId, searchText)
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  }
}

const customAutoComplete = true;
export function autocompletePins(req, res) {
  const user = req.user,
    userId = user && +user.id || 0,
    //pinId = +req.params.id,
    searchText = req.query.q,
    hasFavorite = req.query.f && req.query.f.toLowerCase() == 'watch';

  //console.log('searchPin:', searchText);
  if (hasFavorite) {
    return (customAutoComplete
      ? SearchPins.search(userId, searchText)
      : SearchPins.autocompleteFavorite(userId, searchText))
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  } else {
    return (customAutoComplete
      ? SearchPins.search(userId, searchText)
      : SearchPins.autocomplete(userId, searchText))
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  }
}

export function favoritePin(userId, pin) {
  return SearchPin.favoritePin(userId, new SearchPin(pin));
}

export function unfavoritePin(userId, pin) {
  return SearchPin.unfavoritePin(userId, new SearchPin(pin));
}

export function likePin(userId, pin) {
  return SearchPin.likePin(userId, new SearchPin(pin));
}

export function unlikePin(userId, pin) {
  return SearchPins.unlikePin(userId, new SearchPin(pin));
}

export function upsertPin(pin) {
  return new SearchPin(pin).save();
}

export function deletePin(pin) {
  return SearchPins.delete(pin.id);
}