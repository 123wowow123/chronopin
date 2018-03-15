'use strict';

import li from 'li';

export function withResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      res.status(statusCode).json(entity);
    }
    return null;
  };
}

export function withNoResult(res) {
  return function() {
    res.status(204).end();
    return null;
  }
}

export function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
    return null;
  };
}

export function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

// RFC 5988 Pagination Header
// http://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api#pagination
// https://github.com/richardkall/api_pagination_headers
export function setPaginationHeader(res, urlPrfix, queryCount) {
  return function(pins) {
    if (pins.pins.length) {
      let pinRange = pins.minMaxDateTimePin();
      let linksObject = {
        previous: `${urlPrfix}?from_date_time=-${pinRange.min.utcStartDateTime.toISOString()}&last_pin_id=${pinRange.min.id}`,
        next: `${urlPrfix}?from_date_time=${pinRange.max.utcStartDateTime.toISOString()}&last_pin_id=${pinRange.max.id}`
      };
      res.header('Link', li.stringify(linksObject));
      res.header('X-Range-Count', queryCount);
    }
    return pins;
  };
}