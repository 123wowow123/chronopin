'use strict';

import * as response from '../response';
import * as search from '../../search';
import PinEvents from './pin.search';

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
function updatePin(pin) {
  return search.upsertPin(pin);
}

function createPin() {
  return search.upsertPin(pin);
}
