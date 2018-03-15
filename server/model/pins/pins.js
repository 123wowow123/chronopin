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

var _search = require('../../search');

var search = _interopRequireWildcard(_search);

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Pins = function () {
  // Properties
  // this.pins
  // this.queryCount - probably not needed

  function Pins(pins) {
    (0, _classCallCheck3.default)(this, Pins);

    if (pins) {
      this.set(pins);
    }
  }

  (0, _createClass3.default)(Pins, [{
    key: 'set',
    value: function set(pins) {
      if (Array.isArray(pins)) {
        this.setPins(pins).setQueryCount(undefined);
      } else if (pins.pins && (0, _isInteger2.default)(pins.queryCount)) {
        this.setPins(pins.pins).setQueryCount(pins.queryCount);
      } else {
        throw "Pins cannot set value of arg";
      }
      return this;
    }
  }, {
    key: 'setPins',
    value: function setPins(pins) {
      if (Array.isArray(pins)) {
        // ToDo: should check if pins are pinRows from sql
        this.pins = Pins.mapPinsMedia(pins);
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
      this.pins.forEach(function (p) {
        return p.save();
      });
      return this;
    }
  }, {
    key: 'addSearchScores',
    value: function addSearchScores(searchScores) {
      this.pins.forEach(function (pin) {
        var foundSearchScore = searchScores.find(function (current, index) {
          return +current.id === pin.id;
        });
        if (foundSearchScore) {
          pin.searchScore = foundSearchScore["@search.score"];
        }
      });
      return this;
    }
  }, {
    key: 'minMaxDateTimePin',
    value: function minMaxDateTimePin() {
      // empty array returns null
      if (!this || !this.pins.length) {
        return null;
      }
      //console.log('_minMaxDateTimePin', results);
      var firstPin = this.pins[0],
          lastPin = this.pins[this.pins.length - 1],
          minPin = void 0,
          maxPin = void 0;
      if (firstPin.utcStartDateTime < lastPin.utcStartDateTime) {
        minPin = firstPin;
        maxPin = lastPin;
      } else {
        minPin = lastPin;
        maxPin = firstPin;
      }
      return {
        min: minPin,
        max: maxPin
      };
    }
  }], [{
    key: 'mapPinsMedia',
    value: function mapPinsMedia(pinRows) {
      var pins = [],
          groupedPinRows = void 0;

      groupedPinRows = _.groupBy(pinRows, function (row) {
        return row.id;
      });

      _.forEach(groupedPinRows, function (pinRows) {
        var pin = _model.Pin.mapPinMedia(pinRows);
        pins.push(pin);
      });

      // need to sort properly
      pins = _.chain(pins).sortBy('id').sortBy('utcStartDateTime').value();

      return pins;
    }
  }, {
    key: 'queryForwardByDate',
    value: function queryForwardByDate(fromDateTime, userId, lastPinId, pageSize) {
      return _queryMSSQLPins(true, fromDateTime, userId, lastPinId, 0, pageSize).then(function (res) {
        //console.log('queryForwardByDate', res);
        return new Pins(res);
      });
    }
  }, {
    key: 'queryBackwardByDate',
    value: function queryBackwardByDate(fromDateTime, userId, lastPinId, pageSize) {
      return _queryMSSQLPins(false, fromDateTime, userId, lastPinId, 0, pageSize).then(function (res) {
        //console.log('queryBackwardByDate', res);
        return new Pins(res);
      });
    }
  }, {
    key: 'queryInitialByDate',
    value: function queryInitialByDate(fromDateTime, userId, pageSizePrev, pageSizeNext) {
      return _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext).then(function (res) {
        //console.log('queryInitialByDate', res);
        return new Pins(res);
      });
    }
  }, {
    key: 'queryForwardByDateFilterByHasFavorite',
    value: function queryForwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
      return _queryMSSQLPinsFilterByHasFavorite(true, fromDateTime, userId, lastPinId, 0, pageSize).then(function (res) {
        //console.log('queryForwardByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
    }
  }, {
    key: 'queryBackwardByDateFilterByHasFavorite',
    value: function queryBackwardByDateFilterByHasFavorite(fromDateTime, userId, lastPinId, pageSize) {
      return _queryMSSQLPinsFilterByHasFavorite(false, fromDateTime, userId, lastPinId, 0, pageSize).then(function (res) {
        //console.log('queryBackwardByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
    }
  }, {
    key: 'queryInitialByDateFilterByHasFavorite',
    value: function queryInitialByDateFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext) {
      return _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext).then(function (res) {
        //console.log('queryInitialByDateFilterByHasFavorite', res);
        return new Pins(res);
      });
    }
  }, {
    key: 'querySearch',
    value: function querySearch(searchText) {
      return search.pin(searchText).then(function (res) {
        var serpJson = JSON.parse(res);
        // console.log('querySearch - search match:', serpJson);
        return _queryMSSQLPinsBySearchText(serpJson.value).then(function (res) {
          // console.log('querySearch', res);
          var pins = new Pins(res);
          pins.addSearchScores(serpJson.value);
          return pins;
        });
      });
    }
  }, {
    key: 'querySearchFilterByHasFavorite',
    value: function querySearchFilterByHasFavorite(searchText, userId) {
      return search.pin(searchText).then(function (res) {
        var serpJson = JSON.parse(res);
        // console.log('querySearch - search match:', serpJson);
        return _queryMSSQLPinsBySearchTextFilterByHasFavorite(serpJson.value, userId).then(function (res) {
          // console.log('querySearch', res);
          var pins = new Pins(res);
          pins.addSearchScores(serpJson.value);
          return pins;
        });
      });
    }
  }]);
  return Pins;
}();

exports.default = Pins;


function _mapMediaFromQuery(pin) {
  var mediaObj = {},
      hasProp = void 0;
  for (var prop in pin) {
    if (pin.hasOwnProperty(prop) && prop.startsWith('Media.')) {
      mediaObj[prop.substring(6)] = pin[prop];
      hasProp = true;
    }
  }
  if (hasProp) {
    return [mediaObj];
  }
  return undefined;
}

function _queryMSSQLPins(queryForward, fromDateTime, userId, lastPinId, offset, pageSize) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = void 0;
      var request = new mssql.Request(conn).input('offset', mssql.Int, offset).input('pageSize', mssql.Int, pageSize).input('userId', mssql.Int, userId).input('fromDateTime', mssql.DateTime2(7), fromDateTime).input('lastPinId', mssql.Int, lastPinId).output('queryCount', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      if (queryForward) {
        StoredProcedureName = 'GetPinsWithFavoriteAndLikeNext';
        request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
          var queryCount = void 0;
          //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
          if (err) {
            reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
          }
          // ToDo: doesn't always return value
          try {
            //console.log('returnValue', returnValue); // always return 0
            queryCount = request.parameters.queryCount.value;
            //console.log('queryCount', queryCount);
          } catch (e) {
            queryCount = 0;
          }
          //console.log('_queryMSSQLPins', recordsets[0]);
          resolve({
            pins: recordsets[0],
            queryCount: queryCount
          });
        });
      } else {
        StoredProcedureName = 'GetPinsWithFavoriteAndLikePrev';
        request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
          var queryCount = void 0;
          if (err) {
            reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
          }
          // ToDo: doesn't always return value
          try {
            //console.log('returnValue', returnValue); // always return 0
            queryCount = request.parameters.queryCount.value;
          } catch (e) {
            queryCount = 0;
          }

          resolve({
            pins: recordsets[0],
            queryCount: queryCount
          });
        });
      }
    });
  });
}

function _queryMSSQLPinsInitial(fromDateTime, userId, pageSizePrev, pageSizeNext) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitial';
      var request = new mssql.Request(conn).input('pageSizePrev', mssql.Int, pageSizePrev).input('pageSizeNext', mssql.Int, pageSizeNext).input('userId', mssql.Int, userId).input('fromDateTime', mssql.DateTime2(7), fromDateTime).output('queryCount', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var queryCount = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          queryCount = request.parameters.queryCount.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          queryCount = 0;
        }

        resolve({
          pins: recordsets[0],
          queryCount: queryCount
        });
      });
    });
  });
}

function _queryMSSQLPinsFilterByHasFavorite(queryForward, fromDateTime, userId, lastPinId, offset, pageSize) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = void 0;
      var request = new mssql.Request(conn).input('offset', mssql.Int, offset).input('pageSize', mssql.Int, pageSize).input('userId', mssql.Int, userId).input('fromDateTime', mssql.DateTime2(7), fromDateTime).input('lastPinId', mssql.Int, lastPinId).output('queryCount', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      if (queryForward) {
        StoredProcedureName = 'GetPinsWithFavoriteAndLikeNextFilterByHasFavorite';
        request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
          var queryCount = void 0;
          //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
          if (err) {
            reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
          }
          // ToDo: doesn't always return value
          try {
            //console.log('returnValue', returnValue); // always return 0
            queryCount = request.parameters.queryCount.value;
            //console.log('queryCount', queryCount);
          } catch (e) {
            queryCount = 0;
          }
          //console.log('_queryMSSQLPins', recordsets[0]);
          resolve({
            pins: recordsets[0],
            queryCount: queryCount
          });
        });
      } else {
        StoredProcedureName = 'GetPinsWithFavoriteAndLikePrevFilterByHasFavorite';
        request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
          var queryCount = void 0;
          if (err) {
            reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
          }
          // ToDo: doesn't always return value
          try {
            //console.log('returnValue', returnValue); // always return 0
            queryCount = request.parameters.queryCount.value;
          } catch (e) {
            queryCount = 0;
          }

          resolve({
            pins: recordsets[0],
            queryCount: queryCount
          });
        });
      }
    });
  });
}

function _queryMSSQLPinsInitialFilterByHasFavorite(fromDateTime, userId, pageSizePrev, pageSizeNext) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitialFilterByHasFavorite';
      var request = new mssql.Request(conn).input('pageSizePrev', mssql.Int, pageSizePrev).input('pageSizeNext', mssql.Int, pageSizeNext).input('userId', mssql.Int, userId).input('fromDateTime', mssql.DateTime2(7), fromDateTime).output('queryCount', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var queryCount = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          queryCount = request.parameters.queryCount.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          queryCount = 0;
        }

        resolve({
          pins: recordsets[0],
          queryCount: queryCount
        });
      });
    });
  });
}

function _queryMSSQLPinsBySearchText(searchMatches) {
  //console.log('_queryMSSQLPinsBySearchText', searchIds)
  var tvp = new mssql.Table();
  tvp.columns.add('tId', mssql.Int);

  searchMatches.forEach(function (match) {
    // tvp.columns.add(id, sql.Int);
    tvp.rows.add(+match.id);
  });

  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = void 0;
      var request = new mssql.Request(conn).input('TableIds', mssql.TVP, tvp).output('queryCount', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      StoredProcedureName = 'GetPinByIds';
      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var queryCount = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          queryCount = request.parameters.queryCount.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          queryCount = 0;
        }
        //console.log('_queryMSSQLPins', recordsets[0]);
        resolve({
          pins: recordsets[0],
          queryCount: queryCount
        });
      });
    });
  });
}

function _queryMSSQLPinsBySearchTextFilterByHasFavorite(searchMatches, userId) {
  //console.log('_queryMSSQLPinsBySearchText', searchIds)
  var tvp = new mssql.Table();
  tvp.columns.add('tId', mssql.Int);

  searchMatches.forEach(function (match) {
    // tvp.columns.add(id, sql.Int);
    tvp.rows.add(+match.id);
  });

  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = void 0;
      var request = new mssql.Request(conn).input('TableIds', mssql.TVP, tvp).input('userId', mssql.Int, userId).output('queryCount', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      StoredProcedureName = 'GetPinByIdsFilterByHasFavorite';
      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var queryCount = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          queryCount = request.parameters.queryCount.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          queryCount = 0;
        }
        //console.log('_queryMSSQLPins', recordsets[0]);
        resolve({
          pins: recordsets[0],
          queryCount: queryCount
        });
      });
    });
  });
}
//# sourceMappingURL=pins.js.map
