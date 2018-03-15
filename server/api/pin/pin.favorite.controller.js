'use strict';

import * as response from '../response';

import {
  Pin,
  User,
  Favorite
} from '../../model';

import {
  EventEmitter
} from 'events';

const PinFavoriteEmitter = new EventEmitter();

export function createPinFavorite(req, res) {

  let user = req.user,
    pinId = +req.params.id,
    favoriteBody = req.body,
    newFavorite = new Favorite(favoriteBody, user, new Pin({
      id: pinId
    }));

  return newFavorite.save()
    .then(({
      favorite
    }) => {
      return Pin.queryById(pinId, user.id);
    })
    .then(({
      pin
    }) => {
      let event = "afterFavorite";
      PinFavoriteEmitter.emit(event, pin);
      return pin;
    })
    .then(response.withResult(res, 201))
    .catch(response.handleError(res));
}

// mark as removed only
export function removePinFavorite(req, res) {

  let user = req.user,
    pinId = +req.params.id,
    favoriteBody = req.body,
    newFavorite = new Favorite(favoriteBody, user, new Pin({
      id: pinId
    }));

  return newFavorite.deleteByPinId()
    .then(({
      favorite
    }) => {
      return Pin.queryById(pinId, user.id);
    })
    .then(({
      pin
    }) => {
      let event = "afterUnfavorite";
      PinFavoriteEmitter.emit(event, pin);
      return pin;
    })
    .then(response.withResult(res, 201))
    .catch(response.handleError(res));
}

export {
  PinFavoriteEmitter
};
