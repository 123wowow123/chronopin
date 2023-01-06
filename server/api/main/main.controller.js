'use strict';

import config from '../../config/environment';
import * as _ from 'lodash';
import * as response from '../response';
import * as pinController from '../pin/pin.controller';
import * as dateTimeController from '../dateTime/dateTime.controller';

import {
  Pin,
  Pins,
  User,
  Medium
} from '../../model';

import {
  EventEmitter
} from 'events';


const pageSize = config.pagination.pageSize || 25;

function _setPaginationHeader(res, req) {
  let urlPrefix = req.protocol + '://' + req.get('Host') + req.baseUrl + req.path;
  return results => {
    let queryCount = results.queryCount;
    return response.setPaginationHeader(res, urlPrefix, queryCount)(results);
  };
}

function _getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString) {
  return pinController.getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString);
}

function _getDateTimes(startDateTime, endDateTime) {
  return dateTimeController.getDateTimes(startDateTime, endDateTime);
}

// Get a list of Pins with DateTimes 
export function index(req, res) {
  // need to cast req.query.last_pin_id to int
  let userId = req.user && +req.user.id || 0,
    hasDateTime = !!req.query.from_date_time,
    hasFavorite = !!req.query.hasFavorite,
    fromDateTimeString = req.query.from_date_time,
    querydForward = hasDateTime && fromDateTimeString[0] !== '-',
    lastPinId = +req.query.last_pin_id, // if undefined => NaN
    queryPromise;

  queryPromise = _getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString)
    .then(pins => {
      let pinRange = pins.minMaxDateTimePin();

      // handle case where pins are empty
      if (pinRange) {
        let startDateTime = pinRange.min.utcStartDateTime,
          endDateTime = pinRange.max.utcStartDateTime;

        if (hasDateTime && querydForward) {
          startDateTime = new Date(fromDateTimeString);
        } else if (hasDateTime && !querydForward) {
          endDateTime = new Date(fromDateTimeString.slice(1));
        }

        // start end date needs to be adjusted to account fromDateTimeString
        return _getDateTimes(startDateTime, endDateTime)
          .then(dateTimes => {
            pins.dateTimes = dateTimes.dateTimes;
            return pins;
          });
      } else {
        pins.dateTimes = [];
        return pins;
      }
    });

  return queryPromise
    .then(_setPaginationHeader(res, req))
    .then(response.withResult(res))
    .catch(response.handleError(res));
}
