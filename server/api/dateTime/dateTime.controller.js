'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDateTimes = getDateTimes;
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

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var pageSize = _environment2.default.pagination.pageSize || 25;

// import * as initData from '../../../scripts/data';
// import * as initDB from '../../../scripts/db';

function getDateTimes(startDateTime, endDateTime) {
  return _model.DateTimes.queryByStartEndDate(startDateTime, endDateTime);
}

// Gets a list of DateTime
function index(req, res) {
  // need to cast req.query.last_pin_id to int
  var start = req.query.start,
      end = req.query.end,
      startDateTime = new Date(start),
      endDateTime = new Date(end);

  return getDateTimes(startDateTime, endDateTime).then(response.withResult(res)).catch(response.handleError(res));
}
//# sourceMappingURL=dateTime.controller.js.map
