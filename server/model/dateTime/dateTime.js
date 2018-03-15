'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var prop = ['id', 'title', 'description', 'sourceUrl', 'address', 'tip', 'utcStartDateTime', 'utcEndDateTime', 'allDay', 'alwaysShow', 'utcCreatedDateTime', 'utcUpdatedDateTime', 'searchScore'];

var DateTime = function () {
  function DateTime(dateTime) {
    (0, _classCallCheck3.default)(this, DateTime);

    if (dateTime) {
      this.set(dateTime);
    }
  }

  (0, _createClass3.default)(DateTime, [{
    key: 'set',
    value: function set(dateTime) {
      if (dateTime) {
        for (var i = 0; i < prop.length; i++) {
          this[prop[i]] = dateTime[prop[i]];
        }
      } else {
        throw "DateTime cannot set value of arg";
      }
      return this;
    }
  }, {
    key: 'save',
    value: function save() {
      var _this = this;

      return _createMSSQL(this).then(function (_ref) {
        var dateTime = _ref.dateTime;

        _this.set(dateTime);
        return {
          dateTime: _this
        };
      }).catch(function (err) {
        console.log('DateTime \'' + _this.title + '\' save err:');
        console.log('DateTime \'' + _this.id + '\' save err:', err);
        throw err;
      });
    }

    // update() {
    //   return _updateMSSQL(this);
    // }

    // delete() {
    //   return _deleteMSSQL(this);
    // }

  }, {
    key: 'toJSON',
    value: function toJSON() {
      // omits own and inherited properties with null values
      return _.omitBy(this, _.isNull);
    }

    // static queryById(id) {
    //   return _queryMSSQLDateTimeById(id);
    // }

  }], [{
    key: 'delete',
    value: function _delete(id) {
      return new DateTime({
        id: id
      }).delete();
    }
  }]);
  return DateTime;
}();

// function _queryMSSQLDateTimeById(id) {
//   return cp.getConnection()
//     .then(conn => {
//       //console.log("queryMSSQLDateById then err", err)
//       return new Promise((resolve, reject) => {
//         const StoredProcedureName = 'GetDateTime';
//         let request = new mssql.Request(conn)
//           .input('dateTimeId', mssql.Int, dateTimeId)
//           .execute(`[dbo].[${StoredProcedureName}]`, (err, recordsets, returnValue, affected) => {
//             let dateTime;
//             if (err) {
//               reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
//             }
//             if (recordsets[0].length) {
//               dateTime = new DateTime(recordsets[0]);
//             } else {
//               dateTime = undefined;
//             }
//             resolve({
//               dateTime: dateTime
//             });
//           });
//       });
//     }).catch(err => {
//       // ... connect error checks
//       console.log("queryMSSQLDateTimeById catch err", err);
//       throw err;
//     });
// }

exports.default = DateTime;
function _createMSSQL(dateTime) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'CreateDateTime';
      var request = new mssql.Request(conn).input('title', mssql.NVarChar(1024), dateTime.title).input('description', mssql.NVarChar(4000), dateTime.description).input('sourceUrl', mssql.NVarChar(4000), dateTime.sourceUrl).input('address', mssql.NVarChar(4000), dateTime.address).input('tip', mssql.NVarChar(4000), dateTime.tip).input('utcStartDateTime', mssql.DateTime2(0), dateTime.utcStartDateTime).input('utcEndDateTime', mssql.DateTime2(0), dateTime.utcEndDateTime).input('allDay', mssql.Bit, dateTime.allDay).input('alwaysShow', mssql.Bit, dateTime.alwaysShow).input('utcCreatedDateTime', mssql.DateTime2(7), dateTime.utcCreatedDateTime).input('utcUpdatedDateTime', mssql.DateTime2(7), dateTime.utcUpdatedDateTime).output('id', mssql.Int);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var id = void 0;
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          dateTime.id = request.parameters.id.value;

          //console.log('queryCount', queryCount);
        } catch (e) {
          throw e;
        }

        resolve({
          dateTime: dateTime
        });
      });
    });
  });
}

// function _updateMSSQL(dateTime) {
//   return cp.getConnection()
//     .then(conn => {
//       return new Promise(function(resolve, reject) {
//         const StoredProcedureName = 'UpdateDateTime';
//         let request = new mssql.Request(conn)
//           .input('id', mssql.Int, dateTime.id)
//           .input('title', mssql.NVarChar(1024), dateTime.title)
//           .input('description', mssql.NVarChar(4000), dateTime.description)
//           .input('sourceUrl', mssql.NVarChar(4000), dateTime.sourceUrl)
//           .input('address', mssql.NVarChar(4000), dateTime.address)
//           .input('tip', mssql.NVarChar(4000), dateTime.tip)
//           .input('utcStartDateTime', mssql.DateTime2(7), dateTime.utcStartDateTime)
//           .input('utcEndDateTime', mssql.DateTime2(7), dateTime.utcEndDateTime)
//           .input('allDay', mssql.Bit, dateTime.allDay)
//           .input('utcCreatedDateTime', mssql.DateTime2(7), dateTime.utcCreatedDateTime)
//           .input('utcUpdatedDateTime', mssql.DateTime2(7), dateTime.utcUpdatedDateTime)
//           .output('id', mssql.Int);
//
//         request.execute(`[dbo].[${StoredProcedureName}]`,
//           (err, recordsets, returnValue, affected) => {
//             if (err) {
//               reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
//             }
//             // Todo: updated date time need to be updated on model
//             resolve({
//               dateTime: dateTime
//             });
//           });
//       });
//     });
// }

// function _deleteMSSQL(dateTime) {
//   return cp.getConnection()
//     .then(conn => {
//       return new Promise(function(resolve, reject) {
//         const StoredProcedureName = 'UpdateDateTime';
//         let request = new mssql.Request(conn)
//           .input('id', mssql.Int, dateTime.id)
//           .output('utcDeletedDateTime', mssql.DateTime2(7));
//
//         request.execute(`[dbo].[${StoredProcedureName}]`,
//           (err, recordsets, returnValue, affected) => {
//             let utcDeletedDateTime;
//             if (err) {
//               reject(`execute [dbo].[${StoredProcedureName}] err: ${err}`);
//             }
//             try {
//               //console.log('returnValue', returnValue); // always return 0
//               utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
//               //console.log('queryCount', queryCount);
//             } catch (e) {
//               console.log(`[dbo].[${StoredProcedureName}]`, e);
//             }
//             dateTime.utcDeletedDateTime = utcDeletedDateTime;
//             resolve({
//               utcDeletedDateTime: utcDeletedDateTime,
//               dateTime: dateTime
//             });
//           });
//       });
//     });
// }
//# sourceMappingURL=dateTime.js.map
