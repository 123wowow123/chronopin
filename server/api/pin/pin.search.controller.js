'use strict';

import * as response from '../response';
//import * as fp from 'lodash/fp';

import {
  Pins,
  SearchPins
} from '../../model';

export function searchPin(req, res) {
  let user = req.user,
    //pinId = +req.params.id,
    searchText = req.query.q,
    hasFavorite = req.query.f && req.query.f.toLowerCase() == 'watch';

  //console.log('searchPin:', searchText);
  if (hasFavorite) {
    const userId = +user.id;
    return SearchPins.searchFavorite(userId, searchText)
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
    // return Pins.querySearchFilterByHasFavorite(searchText, userId)
    //   .then(response.withResult(res, 200))
    //   .catch(response.handleError(res));
  } else {
    return SearchPins.search(searchText)
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
    // return Pins.querySearch(searchText)
    //   .then(response.withResult(res, 200))
    //   .catch(response.handleError(res));
  }
}


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

export function favoritePin(userId, pin) {
  return search.favoritePin(userId, mapToSearchPin(pin));
}

export function unfavoritePin(userId, pin) {
  return search.unfavoritePin(userId, mapToSearchPin(pin));
}

export function likePin(userId, pin) {
  return search.likePin(userId, mapToSearchPin(pin));
}

export function unlikePin(userId, pin) {
  return search.unlikePin(userId, mapToSearchPin(pin));
}

export function upsertPin(pin) {
  return search.upsertPin(mapToSearchPin(pin));
}

export function deletePin(pin) {
  return search.removePin(pin.id);
}

function mapToSearchPin(pin) {
  let clonedPin = Object.assign({}, pin);
  delete clonedPin.favoriteCount;
  delete clonedPin.likeCount;
  delete clonedPin.hasFavorite;
  delete clonedPin.hasLike;

  if (!clonedPin.favorites) {
    clonedPin.favorites = [];
  }

  if (!clonedPin.likes) {
    clonedPin.likes = [];
  }

  return clonedPin;
}