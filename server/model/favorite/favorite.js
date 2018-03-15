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

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// _user, userId, _pin, pinId
var prop = ['id', 'utcCreatedDateTime'];

var Favorite = function () {
  function Favorite(favorite, user, pin) {
    (0, _classCallCheck3.default)(this, Favorite);

    Object.defineProperty(this, '_user', {
      enumerable: false,
      configurable: false,
      writable: true
    });

    Object.defineProperty(this, 'userId', {
      get: function get() {
        return this._user && this._user.id;
      },
      set: function set(id) {
        if (this._user) {
          this._user.id = id;
        } else {
          this._user = new _model.User({
            id: id
          });
        }
      },
      enumerable: true,
      configurable: false
    });

    Object.defineProperty(this, '_pin', {
      enumerable: false,
      configurable: false,
      writable: true
    });

    Object.defineProperty(this, 'pinId', {
      get: function get() {
        return this._pin && this._pin.id;
      },
      set: function set(id) {
        if (this._pin) {
          this._pin.id = id;
        } else {
          this._pin = new _model.Pin({
            id: id
          });
        }
      },
      enumerable: true,
      configurable: false
    });

    if (favorite) {
      this.set(favorite, user, pin);
    }
  }

  (0, _createClass3.default)(Favorite, [{
    key: 'set',
    value: function set(favorite, user, pin) {
      if (favorite) {
        for (var i = 0; i < prop.length; i++) {
          this[prop[i]] = favorite[prop[i]];
        }

        if (user instanceof _model.User) {
          this._user = user;
        }

        if (pin instanceof _model.Pin) {
          this._pin = pin;
        }
      } else {
        throw "Favorite cannot set value of arg";
      }
      return this;
    }
  }, {
    key: 'save',
    value: function save() {
      var _this = this;

      return _createMSSQL(this, this.userId, this.pinId).then(function (_ref) {
        var favorite = _ref.favorite;

        _this.set(favorite);
        return {
          favorite: _this
        };
      }).catch(function (err) {
        console.log('Favorite \'' + _this.id + '\' save err:', err);
        throw err;
      });
    }

    // update() {
    //   return _updateMSSQL(this, this.userId);
    // }

  }, {
    key: 'delete',
    value: function _delete() {
      return _deleteMSSQL(this);
    }
  }, {
    key: 'deleteByPinId',
    value: function deleteByPinId() {
      return _deleteByPinIdMSSQL(this);
    }
  }, {
    key: 'setUser',
    value: function setUser(user) {
      this._user = user;
      this.userId = user.id;
      return this;
    }
  }, {
    key: 'setPin',
    value: function setPin(pin) {
      this._pin = pin;
      this.pinId = pin.id;
      return this;
    }
  }], [{
    key: 'queryById',
    value: function queryById(id) {
      return _queryMSSQLFavoriteById(id);
    }
  }, {
    key: 'delete',
    value: function _delete(id) {
      return new Favorite({
        id: id
      }).delete();
    }
  }]);
  return Favorite;
}();

exports.default = Favorite;


function _queryMSSQLFavoriteById(id) {
  return cp.getConnection().then(function (conn) {
    //console.log("queryMSSQLPinById then err", err)
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetFavorite';
      var request = new mssql.Request(conn).input('id', mssql.Int, id).execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var favorite = void 0;
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        if (recordsets[0].length) {
          favorite = new Favorite(recordsets[0] && recordsets[0][0]);
        } else {
          favorite = undefined;
        }
        resolve({
          favorite: favorite
        });
      });
    });
  }).catch(function (err) {
    // ... connect error checks
    console.log("queryMSSQLFavoriteById catch err", err);
    throw err;
  });
}

function _createMSSQL(favorite, userId, pinId) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'CreateFavorite';
      var request = new mssql.Request(conn).input('utcCreatedDateTime', mssql.DateTime2(7), favorite.utcCreatedDateTime).input('userId', mssql.Int, favorite.userId).input('pinId', mssql.Int, favorite.pinId).output('id', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var id = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          favorite.id = request.parameters.id.value;

          //console.log('queryCount', queryCount);
        } catch (e) {
          throw e;
        }

        resolve({
          favorite: favorite
        });
      });
    });
  });
}

function _deleteMSSQL(favorite) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'DeleteFavorite';
      var request = new mssql.Request(conn).input('id', mssql.Int, favorite.id).output('utcDeletedDateTime', mssql.DateTime2(7));

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var utcDeletedDateTime = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        try {
          //console.log('returnValue', returnValue); // always return 0
          utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          console.log('[dbo].[' + StoredProcedureName + ']', e);
        }
        favorite.utcDeletedDateTime = utcDeletedDateTime;
        resolve({
          utcDeletedDateTime: utcDeletedDateTime,
          favorite: favorite
        });
      });
    });
  });
}

function _deleteByPinIdMSSQL(favorite) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'DeleteFavoriteByPinId';
      var request = new mssql.Request(conn).input('pinId', mssql.Int, favorite.pinId).input('userId', mssql.Int, favorite.userId).output('utcDeletedDateTime', mssql.DateTime2(7));

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var utcDeletedDateTime = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        try {
          //console.log('returnValue', returnValue); // always return 0
          utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          console.log('[dbo].[' + StoredProcedureName + ']', e);
        }
        favorite.utcDeletedDateTime = utcDeletedDateTime;
        resolve({
          utcDeletedDateTime: utcDeletedDateTime,
          favorite: favorite
        });
      });
    });
  });
}
//# sourceMappingURL=favorite.js.map
