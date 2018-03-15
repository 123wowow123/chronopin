'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.index = index;

var _environment = require('../../config/environment');

var _environment2 = _interopRequireDefault(_environment);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _response = require('../response');

var response = _interopRequireWildcard(_response);

var _mssql = require('mssql');

var mssql = _interopRequireWildcard(_mssql);

var _pin = require('../pin/pin.controller');

var pinController = _interopRequireWildcard(_pin);

var _dateTime = require('../dateTime/dateTime.controller');

var dateTimeController = _interopRequireWildcard(_dateTime);

var _model = require('../../model');

var _events = require('events');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pageSize = _environment2.default.pagination.pageSize || 25;

function _setPaginationHeader(res, req) {
  var urlPrefix = req.protocol + '://' + req.get('Host') + req.baseUrl + req.path;
  return function (results) {
    var queryCount = results.queryCount;
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
function index(req, res) {
  // need to cast req.query.last_pin_id to int
  var userId = req.user && +req.user.id || 0,
      hasDateTime = !!req.query.from_date_time,
      hasFavorite = !!req.query.hasFavorite,
      fromDateTimeString = req.query.from_date_time,
      querydForward = hasDateTime && fromDateTimeString[0] !== '-',
      lastPinId = +req.query.last_pin_id,
      // if undefined => NaN
  queryPromise = void 0;

  queryPromise = _getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString).then(function (pins) {
    var pinRange = pins.minMaxDateTimePin();

    // handle case where pins are empty
    if (pinRange) {
      var startDateTime = pinRange.min.utcStartDateTime,
          endDateTime = pinRange.max.utcStartDateTime;

      if (hasDateTime && querydForward) {
        startDateTime = new Date(fromDateTimeString);
      } else if (hasDateTime && !querydForward) {
        endDateTime = new Date(fromDateTimeString.slice(1));
      }

      // start end date needs to be adjusted to account fromDateTimeString
      return _getDateTimes(startDateTime, endDateTime).then(function (dateTimes) {
        pins.dateTimes = dateTimes.dateTimes;
        return pins;
      });
    } else {
      pins.dateTimes = [];
      return pins;
    }
  });

  return queryPromise.then(_setPaginationHeader(res, req)).then(response.withResult(res)).catch(response.handleError(res));
}
//# sourceMappingURL=main.controller.js.map
