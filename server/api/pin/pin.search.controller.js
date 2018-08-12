'use strict';

import * as response from '../response';
import * as search from '../../search';

import {
  Pins
} from '../../model';

export function searchPin(req, res) {
  let user = req.user,
    pinId = +req.params.id,
    searchText = req.query.q,
    hasFavorite = !!req.query.hasFavorite;

  //console.log('searchPin:', searchText);
  if (hasFavorite) {
    userId = +user.id;
    return Pins.querySearchFilterByHasFavorite(searchText, userId)
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  } else {
    return Pins.querySearch(searchText)
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  }
}


// Listening to pin events

export function emit(event, pin, userId) {
  switch (event) {
    case "search:favorite":
      favoritePin(userId, pin);
      break;
    case "search:unfavorite":
      unfavoritePin(userId, pin);
    case "search:like":
      likePin(userId, pin);
      break;
    case "search:unlike":
      unlikePin(userId, pin);
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

function favoritePin(userId, pin) {
  return search.favoritePin(userId, pin);
}

function unfavoritePin(userId, pin) {
  return search.unfavoritePin(userId, pin);
}

function likePin(userId, pin) {
  return search.likePin(userId, pin);
}

function unlikePin(userId, pin) {
  return search.unlikePin(userId, pin);
}

function upsertPin(pin) {
  return search.upsertPin(pin);
}

function deletePin(pin) {
  return search.removePin(pin);
}