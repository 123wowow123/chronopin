'use strict';

import config from '../../config/environment';
import * as _ from 'lodash';
import * as response from '../response';
import * as pinController from '../pin/pin.controller';
import * as dateTimeController from '../dateTime/dateTime.controller';
import * as paginationHeader from '../../util/paginationHeader'


const pageSize = config.pagination.pageSize;

function _getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString) {
  return pinController.getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString);
}

function _getDateTimes(startDateTime, endDateTime) {
  return dateTimeController.getDateTimes(startDateTime, endDateTime);
}

// Get a list of Pins with DateTimes 
export function index(req, res) {
  return getPinsAndFormatData(req, res)
    .then(paginationHeader.setPaginationHeader(res, req))
    .then(response.withResult(res))
    .catch(response.handleError(res));
}

//let queryPromise;
export function getPinsAndFormatData(req, res) {
  // need to cast req.query.last_pin_id to int
  let userId = req.user && +req.user.id || 0,
    hasDateTime = !!req.query.from_date_time,
    hasFavorite = !!req.query.hasFavorite,
    fromDateTimeString = req.query.from_date_time,
    querydForward = hasDateTime && fromDateTimeString[0] !== '-',
    lastPinId = +req.query.last_pin_id; // if undefined => NaN

    let queryPromise; // TODO: Move outside and cache`
  //if (!queryPromise)
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
  return queryPromise;
}