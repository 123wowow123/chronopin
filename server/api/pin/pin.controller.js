'use strict';

import config from '../../config/environment';
import moment from 'moment';
import * as response from '../response';
import * as paginationHeader from '../../util/paginationHeader'
import * as createdFilter from '../../util/createdFilter'
import * as weather from '../../weather';
import * as log from '../../util/log';

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

export function getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString, createdSince) {
  // need to cast req.query.last_pin_id to int
  let queryPromise,
    fromDateTime;

  if (hasFavorite) {
    if (hasDateTime) {
      let querydForward = fromDateTimeString[0] !== '-';
      if (querydForward) {
        fromDateTime = fromDateTimeString;
        lastPinId = lastPinId || 0;
        queryPromise = Pins.queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize, createdSince);
      } else {
        lastPinId = lastPinId || 2147483647; // SQL Int Max Size
        fromDateTime = new Date(fromDateTimeString.slice(1));
        fromDateTime = moment(fromDateTime).subtract(1, 'd').toDate();
        queryPromise = Pins.queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize, createdSince);
      }
    } else {
      fromDateTime = new Date();
      queryPromise = Pins.queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSize, pageSize, createdSince); // should be next 10 groups of items
    }
  } else {
    if (hasDateTime) {
      let querydForward = fromDateTimeString[0] !== '-';
      if (querydForward) {
        fromDateTime = fromDateTimeString;
        lastPinId = lastPinId || 0;
        queryPromise = Pins.queryForwardByDate(fromDateTime, userId, lastPinId, pageSize, createdSince);
      } else {
        lastPinId = lastPinId || 2147483647; // SQL Int Max Size
        fromDateTime = new Date(fromDateTimeString.slice(1));
        fromDateTime = moment(fromDateTime).subtract(1, 'd').toDate();
        queryPromise = Pins.queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize, createdSince);
      }
    } else {
      fromDateTime = new Date();
      queryPromise = Pins.queryInitialByDate(fromDateTime, userId, pageSize, pageSize, createdSince); // should be next 10 groups of items
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
    lastPinId = +req.query.last_pin_id, // if undefined => NaN
    createdSince;

  // console.log('hasDateTime', hasDateTime);
  // console.log('hasFavorite', hasFavorite);

  // Resolved up front rather than inside the chain: a malformed window is the
  // caller's mistake, and this way it is reported as one.
  try {
    createdSince = createdFilter.resolveCreatedSince(req.query);
  } catch (err) {
    return response.handleError(res, 400)(err.message);
  }

  return getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString, createdSince)
    .then(paginationHeader.setPaginationHeader(res, req, createdFilter.linkParams(createdSince)))
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

/**
 * Weather at a pin's location on its start date: a forecast, what was
 * recorded, or what is typical, depending on how far off the date is (see
 * server/weather). 204 when the pin has no location or date.
 * GET /api/pins/:id/weather
 */
export function showWeather(req, res) {
  return Pin.queryById(+req.params.id, null)
    .then(({ pin }) => {
      if (!pin) {
        return res.status(404).end();
      }
      return weather.forPin(pin)
        .then(result => {
          if (!result) {
            return res.status(204).end();
          }
          // Matches how long server/weather keeps a forecast.
          res.set('Cache-Control', `public, max-age=${result.kind === 'forecast' ? 900 : 3600}`);
          return res.json(result);
        });
    })
    .catch(err => {
      log.error('showWeather', err && err.message);
      if (!res.headersSent) {
        res.status(502).end();
      }
    });
}

// Creates a new Pin in the DB
export function create(req, res) {
  let user = req.user,
    // userId = +req.user.id,
    media = req.body && req.body.media,
    newPin = new Pin(req.body);

  newPin
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

// A Pin is editable by the person who posted it and by an admin. The routes
// themselves only prove you are signed in, so without this any account could
// rewrite or delete anyone's pins.
function _canModify(user, pin) {
  if (!user || !pin) {
    return false;
  }
  return user.role === 'admin' || +pin.userId === +user.id;
}

// Updates an existing Pin in the DB
export function update(req, res) {
  let pinId = +req.params.id,
    user = req.user;

  return Pin.queryById(pinId)
    .then(({
      pin: existing
    }) => {
      if (!existing) {
        return res.status(404).end();
      }
      if (!_canModify(user, existing)) {
        return res.status(403).send('Forbidden');
      }

      let pin = new Pin(req.body);
      pin.id = pinId;
      // Keep whoever posted it as the author; an edit is not a transfer of
      // ownership, and an update writes userId on every save.
      pin.userId = existing.userId;

      return pin.update()
        .then(({
          pin
        }) => {
          const event = "afterUpdate";
          PinEmitter.emit(event, pin, { userId: user.id });
          return pin;
        })
        .then(response.handleEntityNotFound(res))
        .then(response.withResult(res));
    })
    .catch(response.handleError(res));
}

// Deletes a Pin from the DB
export function destroy(req, res) {
  let user = req.user;

  return Pin.queryById(+req.params.id)
    .then(({
      pin
    }) => {
      if (!pin) {
        return res.status(404).end();
      }
      if (!_canModify(user, pin)) {
        return res.status(403).send('Forbidden');
      }
      return _removeEntity(res)(pin);
    })
    .catch(response.handleError(res));
}

export * from './pin.favorite.controller';
export * from './pin.like.controller';
export * from './pin.comment.controller';
export * from './pin.search.controller';

export {
  PinEmitter
};
