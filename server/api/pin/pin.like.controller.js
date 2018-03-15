'use strict';

import * as response from '../response';

import {
  Pin,
  Like
} from '../../model';

import {
  EventEmitter
} from 'events';

const PinLikeEmitter = new EventEmitter();

export function createPinLike(req, res) {
  let user = req.user,
    pinId = +req.params.id,
    likeBody = typeof req.body.like === "boolean" ? req.body : {
      like: true
    },
    newLike = new Like(likeBody, user, new Pin({
      id: pinId
    }));

    console.log(likeBody)

  return newLike.save()
    .then(({
      like
    }) => {
      return Pin.queryById(pinId, user.id);
    })
    .then(({
      pin
    }) => {
      let event = "afterLike";
      PinLikeEmitter.emit(event, pin);
      return pin;
    })
    .then(response.withResult(res, 201))
    .catch(response.handleError(res));
}

// mark as removed only
export function removePinLike(req, res) {
  let user = req.user,
    pinId = +req.params.id,
    likeBody = req.body,
    newLike = new Like(likeBody, user, new Pin({
      id: pinId
    }));

  return newLike.deleteByPinId()
    .then(({
      like
    }) => {
      return Pin.queryById(pinId, user.id);
    })
    .then(({
      pin
    }) => {
      let event = "afterUnlike";
      PinLikeEmitter.emit(event, pin);
      return pin;
    })
    .then(response.withResult(res, 201))
    .catch(response.handleError(res));
}

export {
  PinLikeEmitter
};
