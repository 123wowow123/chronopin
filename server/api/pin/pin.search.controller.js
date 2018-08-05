'use strict';

import * as response from '../response';

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

export function updatePin(){
  
}

export function createPin(){

}
