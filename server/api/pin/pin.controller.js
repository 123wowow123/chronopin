'use strict';

import config from '../../config/environment';
import moment from 'moment';
import * as response from '../response';
import * as paginationHeader from '../../util/paginationHeader'

import {
  Pin,
  Pins
} from '../../model';

import {
  EventEmitter
} from 'events';


const PinEmitter = new EventEmitter();
const pageSize = config.pagination.pageSize;

function _removeEntity(res) {
  return function (entity) {
    if (entity) {
      return entity.delete()
        .then(obj => {
          const event = "afterDestroy";
          PinEmitter.emit(event, entity);
          return obj;
        })
        .then(response.withNoResult(res));
    }
  };
}

export function getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString) {
  // need to cast req.query.last_pin_id to int
  let queryPromise,
    fromDateTime;

  if (hasFavorite) {
    if (hasDateTime) {
      let querydForward = fromDateTimeString[0] !== '-';
      if (querydForward) {
        fromDateTime = fromDateTimeString;
        lastPinId = lastPinId || 0;
        queryPromise = Pins.queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize);
      } else {
        lastPinId = lastPinId || 2147483647; // SQL Int Max Size
        fromDateTime = new Date(fromDateTimeString.slice(1));
        fromDateTime = moment(fromDateTime).subtract(1, 'd').toDate();
        queryPromise = Pins.queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize);
      }
    } else {
      fromDateTime = new Date();
      queryPromise = Pins.queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSize, pageSize); // should be next 10 groups of items
    }
  } else {
    if (hasDateTime) {
      let querydForward = fromDateTimeString[0] !== '-';
      if (querydForward) {
        fromDateTime = fromDateTimeString;
        lastPinId = lastPinId || 0;
        queryPromise = Pins.queryForwardByDate(fromDateTime, userId, lastPinId, pageSize);
      } else {
        lastPinId = lastPinId || 2147483647; // SQL Int Max Size
        fromDateTime = new Date(fromDateTimeString.slice(1));
        fromDateTime = moment(fromDateTime).subtract(1, 'd').toDate();
        queryPromise = Pins.queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize);
      }
    } else {
      fromDateTime = new Date();
      queryPromise = Pins.queryInitialByDate(fromDateTime, userId, pageSize, pageSize); // should be next 10 groups of items
    }
  }
  return queryPromise;
}

// Gets a list of Pins
export function index(req, res) {
  // need to cast req.query.last_pin_id to int
  let userId = req.user && +req.user.id || 0,
    hasDateTime = !!req.query.from_date_time,
    hasFavorite = !!req.query.hasFavorite,
    fromDateTimeString = req.query.from_date_time,
    lastPinId = +req.query.last_pin_id; // if undefined => NaN

  // console.log('hasDateTime', hasDateTime);
  // console.log('hasFavorite', hasFavorite);

  return getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString)
    .then(paginationHeader.setPaginationHeader(res, req))
    .then(response.withResult(res))
    .catch(response.handleError(res));
}

// Gets a list of Pins in Thread
export function getThreadPins(req, res) {
  let pinId = +req.params.id;

  return Pins.getThreadPins(pinId)
    // .then(paginationHeader.setPaginationHeader(res, req))
    .then(response.withResult(res))
    .catch(response.handleError(res));
}

// Gets a single Pin from the DB
export function show(req, res) {
  let pinId = +req.params.id,
    userId = req.user && +req.user.id;

  return Pin.queryById(pinId, userId)
    .then(({
      pin
    }) => {
      return pin;
    })
    .then(response.withResult(res))
    .catch(response.handleError(res));
}

// Gets a single Edit Pin from the DB
export function showEdit(req, res) {
  let pinId = +req.params.id;

  return Pin.queryByIdForEdit(pinId)
    .then(({
      pin
    }) => {
      return pin;
    })
    .then(response.withResult(res))
    .catch(response.handleError(res));
}

// Creates a new Pin in the DB
export function create(req, res) {
  let user = req.user,
    // userId = +req.user.id,
    newPin = new Pin(req.body);

  newPin
    .rescrapeMention()
    .setUser(user);

  return newPin.save()
    .then(({
      pin
    }) => {
      const event = "afterCreate";
      PinEmitter.emit(event, pin, { userId: user.id });
      return pin;
    })
    .then(response.withResult(res, 201))
    .catch(response.handleError(res));
}

// Updates an existing Pin in the DB
export function update(req, res) {
  //console.log('update pin', req.body)
  let pinId = +req.params.id,
    user = req.user,
    // userId = +req.user.id,
    pin = new Pin(req.body);

  pin
    .rescrapeMention()
    .setUser(user);
  pin.id = pinId;

  return pin.update()
    .then(({
      pin
    }) => {
      const event = "afterUpdate";
      PinEmitter.emit(event, pin, { userId: user.id });
      return pin;
    })
    .then(response.handleEntityNotFound(res))
    .then(response.withResult(res))
    .catch(response.handleError(res));
}

// Deletes a Pin from the DB
export function destroy(req, res) {
  return Pin.queryById(req.params.id)
    .then(response.handleEntityNotFound(res))
    .then(_removeEntity(res))
    .catch(response.handleError(res));
}

export * from './pin.favorite.controller';
export * from './pin.like.controller';
export * from './pin.search.controller';

export {
  PinEmitter
};
