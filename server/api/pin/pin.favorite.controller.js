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

  return _pinExists(pinId, res)
    .then(exists => {
      if (!exists) {
        return;
      }
      return newFavorite.save()
        .then(({
          favorite
        }) => {
          return Pin.queryById(pinId, user.id);
        })
        .then(({
          pin
        }) => {
          const event = "afterFavorite";
          PinFavoriteEmitter.emit(event, pin, { userId: user.id });
          return pin;
        })
        .then(response.withResult(res, 201));
    })
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

  return _pinExists(pinId, res)
    .then(exists => {
      if (!exists) {
        return;
      }
      return newFavorite.deleteByPinId()
        .then(({
          favorite
        }) => {
          return Pin.queryById(pinId, user.id);
        })
        .then(({
          pin
        }) => {
          const event = "afterUnfavorite";
          PinFavoriteEmitter.emit(event, pin, { userId: user.id });
          return pin;
        })
        .then(response.withResult(res, 201));
    })
    .catch(response.handleError(res));
}

// Nothing is written for a pin that does not exist (or was deleted): the
// request gets a 404 instead of a row pointing at no pin.
function _pinExists(pinId, res) {
  return Pin.queryById(pinId)
    .then(({
      pin
    }) => {
      if (!pin) {
        res.status(404).end();
      }
      return !!pin;
    });
}

export {
  PinFavoriteEmitter
};
