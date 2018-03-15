/*jshint eqnull:true */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _isInteger = require('babel-runtime/core-js/number/is-integer');

var _isInteger2 = _interopRequireDefault(_isInteger);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _mssql = require('mssql');

var mssql = _interopRequireWildcard(_mssql);

var _sqlConnectionPool = require('../../sqlConnectionPool');

var cp = _interopRequireWildcard(_sqlConnectionPool);

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DateTimes = function () {
  // Properties
  // this.dates
  // this.queryCount - probably not needed

  function DateTimes(dateTimes) {
    (0, _classCallCheck3.default)(this, DateTimes);

    if (dateTimes) {
      this.set(dateTimes);
    }
  }

  (0, _createClass3.default)(DateTimes, [{
    key: 'set',
    value: function set(dateTimes) {
      if (Array.isArray(dateTimes)) {
        this.setDateTimes(dateTimes).setQueryCount(undefined);
      } else if (dateTimes.dateTimes && (0, _isInteger2.default)(dateTimes.queryCount)) {
        this.setDateTimes(dateTimes.dateTimes).setQueryCount(dateTimes.queryCount);
      } else {
        throw "Dates cannot set value of arg";
      }
      return this;
    }
  }, {
    key: 'setDateTimes',
    value: function setDateTimes(dateTimes) {
      if (Array.isArray(dateTimes)) {
        this.dateTimes = dateTimes.map(function (dt) {
          return new _model.DateTime(dt);
        });
      } else {
        throw "arg is not an array";
      }
      return this;
    }
  }, {
    key: 'setQueryCount',
    value: function setQueryCount(queryCount) {
      if ((0, _isInteger2.default)(queryCount) || queryCount == null) {
        this.queryCount = queryCount;
      } else {
        throw "arg is not an integer, undefined, null";
      }
      return this;
    }
  }, {
    key: 'save',
    value: function save() {
      this.dateTimes.forEach(function (p) {
        return p.save();
      });
      return this;
    }
  }], [{
    key: 'queryByStartEndDate',
    value: function queryByStartEndDate(startDateTime, endDateTime) {
      return _queryMSSQLDateTimesByStartEndDate(startDateTime, endDateTime).then(function (res) {
        //console.log('queryByStartEndDate', res);
        return new DateTimes(res);
      });
    }
  }]);
  return DateTimes;
}();

exports.default = DateTimes;


function _queryMSSQLDateTimesByStartEndDate(startDateTime, endDateTime) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetDateTimesByStartEndDate';
      var request = new mssql.Request(conn).input('startDateTime', mssql.DateTime2(7), startDateTime).input('endDateTime', mssql.DateTime2(7), endDateTime);

      //console.log('GetDateTimesByStartEndDate', startDateTime, endDateTime);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var queryCount = void 0;
        //console.log('GetDateTimesByStartEndDate', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }

        queryCount = recordsets[0].length;

        resolve({
          dateTimes: recordsets[0],
          queryCount: queryCount
        });
      });
    });
  });
}
//# sourceMappingURL=dateTimes.js.map
