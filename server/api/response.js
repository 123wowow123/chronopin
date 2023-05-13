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
export function setPaginationHeader(res, urlPrfix, queryCount) {
  return function (pins) {
    if (pins.pins.length) {
      const linksObject = _getLinkObject(pins, urlPrfix);
      res.header('Link', li.stringify(linksObject));
      res.header('X-Range-Count', queryCount);
    }
    return pins;
  };
}

export function setPaginationObject(res, urlPrfix, queryCount) {
  return function (pins) {
    if (pins.pins.length) {
      const linksObject = _getLinkObject(pins, urlPrfix);
      pins.link = li.stringify(linksObject);
      pins.queryCount = queryCount;
    }
    return pins;
  };
}

function _getLinkObject(pins, urlPrfix) {
  const pinRange = pins.minMaxDateTimePin();
  const linksObject = {
    previous: `${urlPrfix}?from_date_time=-${pinRange.min.utcStartDateTime.toISOString()}&last_pin_id=${pinRange.min.id}`,
    next: `${urlPrfix}?from_date_time=${pinRange.max.utcStartDateTime.toISOString()}&last_pin_id=${pinRange.max.id}`
  };
  return linksObject
}