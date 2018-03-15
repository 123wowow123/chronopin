'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withResult = withResult;
exports.withNoResult = withNoResult;
exports.handleError = handleError;
exports.handleEntityNotFound = handleEntityNotFound;
exports.setPaginationHeader = setPaginationHeader;

var _li = require('li');

var _li2 = _interopRequireDefault(_li);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function withResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function (entity) {
    if (entity) {
      res.status(statusCode).json(entity);
    }
    return null;
  };
}

function withNoResult(res) {
  return function () {
    res.status(204).end();
    return null;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    res.status(statusCode).send(err);
    return null;
  };
}

function handleEntityNotFound(res) {
  return function (entity) {
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
function setPaginationHeader(res, urlPrfix, queryCount) {
  return function (pins) {
    if (pins.pins.length) {
      var pinRange = pins.minMaxDateTimePin();
      var linksObject = {
        previous: urlPrfix + '?from_date_time=-' + pinRange.min.utcStartDateTime.toISOString() + '&last_pin_id=' + pinRange.min.id,
        next: urlPrfix + '?from_date_time=' + pinRange.max.utcStartDateTime.toISOString() + '&last_pin_id=' + pinRange.max.id
      };
      res.header('Link', _li2.default.stringify(linksObject));
      res.header('X-Range-Count', queryCount);
    }
    return pins;
  };
}
//# sourceMappingURL=response.js.map
