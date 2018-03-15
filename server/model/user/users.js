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

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Users = function () {
  // Properties
  // this.users
  // this.queryCount - probably not needed

  function Users(users) {
    (0, _classCallCheck3.default)(this, Users);

    if (users) {
      this.set(users);
    }
  }

  (0, _createClass3.default)(Users, [{
    key: 'set',
    value: function set(users) {
      if (Array.isArray(users)) {
        this.setUsers(users).setQueryCount(undefined);
      } else if (users.users && (0, _isInteger2.default)(users.queryCount)) {
        this.setUsers(users.users).setQueryCount(users.queryCount);
      } else {
        throw "Users cannot set value of arg";
      }
      return this;
    }
  }, {
    key: 'setUsers',
    value: function setUsers(users) {
      if (Array.isArray(users)) {
        this.users = users.map(function (u) {
          return new _model.User(u);
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
      return this;
    }
  }, {
    key: 'pick',
    value: function pick(properties) {
      return new Users(this.users.map(function (user) {
        return user.pick(properties);
      }));
    }
  }], [{
    key: 'getAll',
    value: function getAll(properties) {
      return _getAllUsersMSSQL().then(function (_ref) {
        var users = _ref.users;

        return users.setQueryCount(users.users.length).pick(properties);
      });
    }
  }]);
  return Users;
}();

exports.default = Users;


function _getAllUsersMSSQL() {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetAllUserSP';
      var request = new mssql.Request(conn);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var users = void 0;
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        users = recordsets && recordsets[0] && new Users(recordsets[0]);
        resolve({
          users: users
        });
      });
    });
  });
}
//# sourceMappingURL=users.js.map
