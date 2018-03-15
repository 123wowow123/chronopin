'use strict';

var _defineProperty = require('babel-runtime/core-js/object/define-property');

var _defineProperty2 = _interopRequireDefault(_defineProperty);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PinEmitter = undefined;
exports.getPins = getPins;
exports.index = index;
exports.show = show;
exports.create = create;
exports.update = update;
exports.destroy = destroy;

var _pinFavorite = require('./pin.favorite.controller');

(0, _keys2.default)(_pinFavorite).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  (0, _defineProperty2.default)(exports, key, {
    enumerable: true,
    get: function get() {
      return _pinFavorite[key];
    }
  });
});

var _pinLike = require('./pin.like.controller');

(0, _keys2.default)(_pinLike).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  (0, _defineProperty2.default)(exports, key, {
    enumerable: true,
    get: function get() {
      return _pinLike[key];
    }
  });
});

var _pinSearch = require('./pin.search.controller');

(0, _keys2.default)(_pinSearch).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  (0, _defineProperty2.default)(exports, key, {
    enumerable: true,
    get: function get() {
      return _pinSearch[key];
    }
  });
});

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

var _model = require('../../model');

var _events = require('events');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PinEmitter = new _events.EventEmitter();
var pageSize = _environment2.default.pagination.pageSize || 25;

function _removeEntity(res) {
  return function (entity) {
    if (entity) {
      return entity.delete().then(function (obj) {
        var event = "afterDestroy";
        PinEmitter.emit(event, entity);
        return obj;
      }).then(response.withNoResult(res));
    }
  };
}

function _setPaginationHeader(res, req) {
  var urlPrefix = req.protocol + '://' + req.get('Host') + req.baseUrl + req.path;
  return function (pins) {
    var queryCount = pins.queryCount;
    return response.setPaginationHeader(res, urlPrefix, queryCount)(pins);
  };
}

function getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString) {
  // need to cast req.query.last_pin_id to int
  var queryPromise = void 0,
      fromDateTime = void 0;

  if (hasFavorite) {
    if (hasDateTime) {
      var querydForward = fromDateTimeString[0] !== '-';
      if (querydForward) {
        fromDateTime = fromDateTimeString;
        lastPinId = lastPinId || 0;
        queryPromise = _model.Pins.queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize);
      } else {
        lastPinId = lastPinId || 2147483647; // SQL Int Max Size
        fromDateTime = new Date(fromDateTimeString.slice(1));
        fromDateTime = (0, _moment2.default)(fromDateTime).subtract(1, 'd').toDate();
        queryPromise = _model.Pins.queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize);
      }
    } else {
      fromDateTime = new Date();
      queryPromise = _model.Pins.queryInitialByDateFilterByHasFavorite(fromDateTime, userId, 10, 20); // should be next 10 groups of items
    }
  } else {
    if (hasDateTime) {
      var _querydForward = fromDateTimeString[0] !== '-';
      if (_querydForward) {
        fromDateTime = fromDateTimeString;
        lastPinId = lastPinId || 0;
        queryPromise = _model.Pins.queryForwardByDate(fromDateTime, userId, lastPinId, pageSize);
      } else {
        lastPinId = lastPinId || 2147483647; // SQL Int Max Size
        fromDateTime = new Date(fromDateTimeString.slice(1));
        fromDateTime = (0, _moment2.default)(fromDateTime).subtract(1, 'd').toDate();
        queryPromise = _model.Pins.queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize);
      }
    } else {
      fromDateTime = new Date();
      queryPromise = _model.Pins.queryInitialByDate(fromDateTime, userId, 10, 20); // should be next 10 groups of items
    }
  }
  return queryPromise;
}

// Gets a list of Pins
function index(req, res) {
  // need to cast req.query.last_pin_id to int
  var userId = req.user && +req.user.id || 0,
      hasDateTime = !!req.query.from_date_time,
      hasFavorite = !!req.query.hasFavorite,
      fromDateTimeString = req.query.from_date_time,
      lastPinId = +req.query.last_pin_id; // if undefined => NaN

  // console.log('hasDateTime', hasDateTime);
  // console.log('hasFavorite', hasFavorite);

  return getPins(userId, hasDateTime, hasFavorite, lastPinId, fromDateTimeString).then(_setPaginationHeader(res, req)).then(response.withResult(res)).catch(response.handleError(res));
}

// Gets a single Pin from the DB
function show(req, res) {
  var pinId = +req.params.id,
      userId = req.user && +req.user.id;

  return _model.Pin.queryById(pinId, userId).then(function (_ref) {
    var pin = _ref.pin;

    return pin;
  }).then(response.withResult(res)).catch(response.handleError(res));
}

// Creates a new Pin in the DB
function create(req, res) {
  var user = req.user,
      userId = +req.user.id,
      media = req.body && req.body.media,
      newPin = new _model.Pin(req.body);

  newPin.setUser(user);

  return newPin.save().then(function (_ref2) {
    var pin = _ref2.pin;

    var event = "afterCreate";
    PinEmitter.emit(event, pin);
    return pin;
  }).then(response.withResult(res, 201)).catch(response.handleError(res));
}

// Updates an existing Pin in the DB
function update(req, res) {
  //console.log('update pin', req.body)
  var pinId = +req.params.id,
      pin = new _model.Pin(req.body);
  pin.id = pinId;

  return pin.update().then(function (_ref3) {
    var pin = _ref3.pin;

    return pin;
  }).then(response.handleEntityNotFound(res)).then(response.withResult(res)).catch(response.handleError(res));
}

// Deletes a Pin from the DB
function destroy(req, res) {
  return _model.Pin.queryById(req.params.id).then(response.handleEntityNotFound(res)).then(_removeEntity(res)).catch(response.handleError(res));
}

exports.PinEmitter = PinEmitter;
//# sourceMappingURL=pin.controller.js.map
