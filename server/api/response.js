'use strict';

import li from 'li';
import * as log from '../util/log';

export function withResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function (entity) {
    if (entity) {
      try {
        res.status(statusCode).json(entity);
      }
      catch (err) {
        log.error('withResult', log.stringify(err));
        handleError(res)(err.message);
      }
    }
  };
}

export function withNoResult(res) {
  return function () {
    res.status(204).end();
  }
}

export function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
  };
}

export function handleEntityNotFound(res) {
  return function (entity) {
    if (!entity) {
      res.status(404).end();
    }
    return entity;
  };
}

// RFC 5988 Pagination Header
// http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api#pagination
// https://github.com/richardkall/api_pagination_headers
export function setPaginationHeader(res, urlPrfix, queryCount, carryParams) {
  return function (pins) {
    if (pins.pins.length) {
      const linksObject = _getLinkObject(pins, urlPrfix, carryParams);
      res.header('Link', li.stringify(linksObject));
      res.header('X-Range-Count', queryCount);
    }
    return pins;
  };
}

export function setPaginationObject(res, urlPrfix, queryCount, carryParams) {
  return function (pins) {
    if (pins.pins.length) {
      const linksObject = _getLinkObject(pins, urlPrfix, carryParams);
      pins.link = li.stringify(linksObject);
      pins.queryCount = queryCount;
    }
    return pins;
  };
}

function _getLinkObject(pins, urlPrfix, carryParams) {
  const pinRange = pins.minMaxDateTimePin();
  // Any active filter has to ride along on these links: the client hands each
  // one straight back as the query for the next page, so whatever is missing
  // here is silently dropped the moment the timeline scrolls.
  const carried = _stringifyCarryParams(carryParams);
  const linksObject = {
    previous: `${urlPrfix}?from_date_time=-${pinRange.min.utcStartDateTime.toISOString()}&last_pin_id=${pinRange.min.id}${carried}`,
    next: `${urlPrfix}?from_date_time=${pinRange.max.utcStartDateTime.toISOString()}&last_pin_id=${pinRange.max.id}${carried}`
  };
  return linksObject
}

function _stringifyCarryParams(carryParams) {
  return Object.keys(carryParams || {})
    .filter(key => carryParams[key] !== null && carryParams[key] !== undefined)
    .map(key => `&${encodeURIComponent(key)}=${encodeURIComponent(carryParams[key])}`)
    .join('');
}