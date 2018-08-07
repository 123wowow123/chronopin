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

export function emit(event, pin) {
  switch (event) {
    case "search:favorite":
    case "search:unfavorite":
    case "search:like":
    case "search:unlike":
    case "search:save":
    case "search:update":
      upsertPin(pin);
      break;
    case "search:remove":
      deletePin(pin);
      break;
  }
}

function upsertPin(pin) {
  return search.upsertPin(pin);
}

function deletePin(pin) {
  return search.removePin(pin);
}

