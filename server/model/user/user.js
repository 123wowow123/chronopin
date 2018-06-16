'use strict';

var _defineProperty = require('babel-runtime/core-js/object/define-property');

var _defineProperty2 = _interopRequireDefault(_defineProperty);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _facebook = require('./facebook.mapper');

(0, _keys2.default)(_facebook).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  (0, _defineProperty2.default)(exports, key, {
    enumerable: true,
    get: function get() {
      return _facebook[key];
    }
  });
});

var _mssql = require('mssql');

var mssql = _interopRequireWildcard(_mssql);

var _sqlConnectionPool = require('../../sqlConnectionPool');

var cp = _interopRequireWildcard(_sqlConnectionPool);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var authTypes = ['github', 'twitter', 'facebook', 'google'];
var defaultPasswordEncryptIterations = 10000;
var defaultPasswordOutputKeyLength = 64;

var validatePresenceOf = function validatePresenceOf(value) {
  return value && value.length;
};

var prop = ['id', 'firstName', 'lastName', 'gender', 'locale', 'facebookId', 'pictureUrl', 'fbUpdatedTime', 'fbverified', 'email', 'about', 'password', 'role', 'provider', 'salt', 'websiteUrl', 'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime'];

var User = function () {
  function User(user) {
    (0, _classCallCheck3.default)(this, User);

    if (user) {
      this.set(user);
    }
  }

  (0, _createClass3.default)(User, [{
    key: 'set',
    value: function set(user) {
      if (user) {
        for (var i = 0; i < prop.length; i++) {
          this[prop[i]] = user[prop[i]];
        }
      } else {
        throw "User cannot set value of arg";
      }
      return this;
    }

    /**
     * Authenticate - check if the passwords are the same
     *
     * @param {String} password
     * @param {Function} callback
     * @return {Boolean}
     * @api public
     */

  }, {
    key: 'authenticate',
    value: function authenticate(password, callback) {
      var _this = this;

      if (!callback) {
        return this.password === this.encryptPassword(password);
      }

      this.encryptPassword(password, function (err, pwdGen) {
        if (err) {
          callback(err);
        }

        if (_this.password === pwdGen) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      });
    }

    /**
     * Make salt
     *
     * @param {Number} byteSize Optional salt byte size, default to 16
     * @param {Function} callback
     * @return {String}
     * @api public
     */

  }, {
    key: 'makeSalt',
    value: function makeSalt(byteSize, callback) {
      var defaultByteSize = 16;

      if (typeof arguments[0] === 'function') {
        callback = arguments[0];
        byteSize = defaultByteSize;
      } else if (typeof arguments[1] === 'function') {
        callback = arguments[1];
      }

      if (!byteSize) {
        byteSize = defaultByteSize;
      }

      if (!callback) {
        return _crypto2.default.randomBytes(byteSize).toString('base64');
      }

      return _crypto2.default.randomBytes(byteSize, function (err, salt) {
        if (err) {
          callback(err);
        }
        return callback(null, salt.toString('base64'));
      });
    }

    /**
     * Encrypt password
     *
     * @param {String} password
     * @param {Function} callback
     * @return {String}
     * @api public
     */

  }, {
    key: 'encryptPassword',
    value: function encryptPassword(password, callback) {
      if (!password || !this.salt) {
        if (!callback) {
          return null;
        }
        return callback(null);
      }

      var salt = new Buffer(this.salt, 'base64');

      if (!callback) {
        return _crypto2.default.pbkdf2Sync(password, salt, defaultPasswordEncryptIterations, defaultPasswordOutputKeyLength, 'sha512').toString('base64');
      }

      return _crypto2.default.pbkdf2(password, salt, defaultPasswordEncryptIterations, defaultPasswordOutputKeyLength, 'sha512', function (err, key) {
        if (err) {
          callback(err);
        }
        return callback(null, key.toString('base64'));
      });
    }

    /**
     * Update password field
     *
     * @param {Function} fn
     * @return {String}
     * @api public
     */

  }, {
    key: 'updatePassword',
    value: function updatePassword(fn) {
      var _this2 = this;

      // Handle new/update passwords
      if (this.password) {
        if (!validatePresenceOf(this.password) && authTypes.indexOf(this.provider) === -1) {
          fn(new Error('Invalid password'));
        }

        // Make salt with a callback
        this.makeSalt(function (saltErr, salt) {
          if (saltErr) {
            fn(saltErr);
          }
          _this2.salt = salt;
          _this2.encryptPassword(_this2.password, function (encryptErr, hashedPassword) {
            if (encryptErr) {
              fn(encryptErr);
            }
            _this2.password = hashedPassword;
            fn(null);
          });
        });
      } else {
        fn(null);
      }
    }
  }, {
    key: 'save',
    value: function save() {
      var _this3 = this;

      // save will always regenerate password hash
      return new _promise2.default(function (resolve, reject) {
        _this3.updatePassword(function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }).then(function () {
        return _createMSSQL(_this3);
      });
    }
  }, {
    key: 'update',
    value: function update() {
      var _this4 = this;

      // update will always regenerate password hash
      return new _promise2.default(function (resolve, reject) {
        _this4.updatePassword(function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }).then(function () {
        return _updateMSSQL(_this4);
      });
    }
  }, {
    key: 'delete',
    value: function _delete() {
      return _deleteMSSQL(this);
    }
  }, {
    key: 'adminDelete',
    value: function adminDelete() {
      return _adminDeleteMSSQL(this);
    }
  }, {
    key: 'pick',
    value: function pick(properties) {
      return _lodash2.default.pick.apply(_lodash2.default, [this].concat((0, _toConsumableArray3.default)(properties)));
    }
  }], [{
    key: 'getById',
    value: function getById(id) {
      return _getUserByIdMSSQL(id);
    }
  }, {
    key: 'getByFacebookId',
    value: function getByFacebookId(facebookId) {
      return _getUserByFacebookIdMSSQL(facebookId);
    }
  }, {
    key: 'getByEmail',
    value: function getByEmail(email) {
      return _getUserByEmailMSSQL(email);
    }
  }]);
  return User;
}();

exports.default = User;


function _createMSSQL(user) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'CreateUser';
      var request = new mssql.Request(conn)
      // fb public attributes
      .input('firstName', mssql.NVarChar(255), user.firstName).input('lastName', mssql.NVarChar(255), user.lastName).input('gender', mssql.NVarChar(255), user.gender).input('locale', mssql.NChar(5), user.locale).input('facebookId', mssql.NVarChar(25), user.facebookId).input('pictureUrl', mssql.NVarChar(255), user.pictureUrl).input('fbUpdatedTime', mssql.DateTime2(7), user.fbUpdatedTime).input('fbverified', mssql.Bit, user.fbverified).input('about', mssql.NVarChar(1000), user.about)
      // fb private attributes
      .input('email', mssql.NVarChar(255), user.email)
      // cp attributes
      .input('password', mssql.NVarChar(255), user.password).input('provider', mssql.NVarChar(255), user.provider).input('role', mssql.NVarChar(255), user.role).input('salt', mssql.NVarChar(255), user.salt).input('websiteUrl', mssql.NVarChar(500), user.websiteUrl).input('utcCreatedDateTime', mssql.DateTime2(7), user.utcCreatedDateTime).input('utcUpdatedDateTime', mssql.DateTime2(7), user.utcCreatedDateTime).input('utcDeletedDateTime', mssql.DateTime2(7), user.utcDeletedDateTime).output('id', mssql.Int);

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
          id = request.parameters.id.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          id = 0;
        }
        user.id = id;
        resolve({
          user: user
        });
      });
    });
  });
}

function _updateMSSQL(user) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'UpdateUser';
      var request = new mssql.Request(conn)
      // fb public attributes
      .input('id', mssql.Int, user.id).input('firstName', mssql.NVarChar(255), user.firstName).input('lastName', mssql.NVarChar(255), user.lastName).input('gender', mssql.NVarChar(255), user.gender).input('locale', mssql.NChar(5), user.locale).input('facebookId', mssql.NVarChar(25), user.facebookId).input('pictureUrl', mssql.NVarChar(255), user.pictureUrl).input('fbUpdatedTime', mssql.DateTime2(7), user.fbUpdatedTime).input('fbverified', mssql.Bit, user.fbverified).input('about', mssql.NVarChar(1000), user.about)
      // fb private attributes
      .input('email', mssql.NVarChar(255), user.email)
      // cp attributes
      .input('password', mssql.NVarChar(255), user.password).input('provider', mssql.NVarChar(255), user.provider).input('role', mssql.NVarChar(255), user.role).input('salt', mssql.NVarChar(255), user.salt).input('websiteUrl', mssql.NVarChar(500), user.websiteUrl);

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
          id = request.parameters.id.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          id = 0;
        }
        user.id = id;
        resolve({
          user: user
        });
      });
    });
  });
}

function _deleteMSSQL(user) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'DeleteUserById';
      var request = new mssql.Request(conn)
      // fb public attributes
      .input('id', mssql.Int, user.id).output('utcDeletedDateTime', mssql.DateTime2(7));

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var utcDeletedDateTime = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          console.log('[dbo].[' + StoredProcedureName + ']', e);
        }
        user.utcDeletedDateTime = utcDeletedDateTime;
        resolve({
          utcDeletedDateTime: utcDeletedDateTime,
          user: user
        });
      });
    });
  });
}

function _adminDeleteMSSQL(user) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'AdminDeleteUserById';
      var request = new mssql.Request(conn)
      // fb public attributes
      .input('id', mssql.Int, user.id);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var utcDeletedDateTime = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          utcDeletedDateTime = request.parameters.utcDeletedDateTime.value;
          //console.log('queryCount', queryCount);
        } catch (e) {
          console.log('[dbo].[' + StoredProcedureName + ']', e);
        }
        user.utcDeletedDateTime = utcDeletedDateTime;
        resolve({
          user: user
        });
      });
    });
  });
}

function _getUserByIdMSSQL(id) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetUserById';
      var user = void 0;
      var request = new mssql.Request(conn)
      // fb public attributes
      .input('id', mssql.INT, id);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        if (recordsets[0].length) {
          user = new User(recordsets[0] && recordsets[0][0]);
        } else {
          user = undefined;
        }
        resolve({
          user: user
        });
      });
    });
  });
}

function _getUserByFacebookIdMSSQL(facebookId) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetUserByFacebookId';
      var user = void 0;
      var request = new mssql.Request(conn).input('facebookId', mssql.NVarChar(25), facebookId);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        if (recordsets[0].length) {
          //console.log('_getUserByFacebookIdMSSQL', recordsets[0]);
          user = new User(recordsets[0] && recordsets[0][0]);
          //console.log('_getUserByFacebookIdMSSQL constructed', user);
        } else {
          user = undefined;
        }
        resolve({
          user: user
        });
      });
    });
  });
}

function _getUserByEmailMSSQL(email) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetUserByEmail';
      var user = void 0;
      var request = new mssql.Request(conn)
      // fb public attributes
      .input('email', mssql.NVarChar, email);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        if (recordsets[0].length) {
          user = new User(recordsets[0] && recordsets[0][0]);
        } else {
          user = undefined;
        }
        resolve({
          user: user
        });
      });
    });
  });
}
//# sourceMappingURL=user.js.map
