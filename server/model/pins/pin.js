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

// _user, userId, media
var prop = ['id', 'title', 'description', 'sourceUrl', 'address', 'priceLowerBound', 'priceUpperBound', 'price', 'tip', 'utcStartDateTime', 'utcEndDateTime', 'allDay', 'utcCreatedDateTime', 'utcUpdatedDateTime', 'utcDeletedDateTime', 'favoriteCount', 'likeCount', 'hasFavorite', 'hasLike', 'searchScore'];

function _difference(baseArray, otherArray, propName) {
  return baseArray.filter(function (obj) {
    return !otherArray.find(function (otherObj) {
      otherObj[propName] === obj[propName];
    });
  });
}

var Pin = function () {
  function Pin(pin, user) {
    (0, _classCallCheck3.default)(this, Pin);

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

    this.media = [];

    if (pin) {
      this.set(pin, user);
    }
  }

  (0, _createClass3.default)(Pin, [{
    key: 'set',
    value: function set(pin, user) {
      var _this = this;

      if (pin) {
        for (var i = 0; i < prop.length; i++) {
          this[prop[i]] = pin[prop[i]];
        }
        this.media = pin.media && pin.media.map(function (m) {
          return new _model.Medium(m, _this);
        }) || [];

        if (user instanceof _model.User) {
          this._user = user;
        }
      } else {
        throw "Pin cannot set value of arg";
      }
      return this;
    }
  }, {
    key: 'save',
    value: function save() {
      var _this2 = this;

      return _createMSSQL(this, this.userId).then(function (_ref) {
        var pin = _ref.pin;

        //console.log('_createMSSQL', pin);
        var mediaPromise = void 0;
        if (_this2.media && _this2.media.length) {
          mediaPromise = _this2.media.map(function (medium) {
            return medium.createAndSaveToCDN();
          });
        } else {
          mediaPromise = ['resolved'];
        }
        return _promise2.default.all(mediaPromise).then(function () {
          _this2.set(pin);
          return {
            pin: _this2
          };
        });
      }).catch(function (err) {
        console.log('Pin \'' + _this2.title + '\' save err:');
        console.log('Pin \'' + _this2.id + '\' save err:', err);
        throw err;
      });
    }
  }, {
    key: 'update',
    value: function update() {
      var _this3 = this;

      var beforePin = Pin.queryById(this.id, this.userId).then(function (_ref2) {
        var beforePin = _ref2.beforePin;

        var beforePinMedia = beforePin.media,
            newPinMedia = _this3.media,
            toSaveOriginalMedia = [],
            toDeleteOriginalMedia = [],
            toSaveMediaPromise = [],
            toDeleteMediaPromise = [];

        toSaveOriginalMedia = _difference(newPinMedia, beforePinMedia, 'originalUrl');
        toDeleteOriginalMedia = _difference(beforePinMedia, newPinMedia, 'originalUrl');

        toSaveMediaPromise = toSaveOriginalMedia.map(function (medium) {
          return medium.createAndSaveToCDN();
        }).then(function (newMedia) {
          _this3.media = newMedia;
        });

        toDeleteMediaPromise = toSaveOriginalMedia.map(function (medium) {
          return medium.deleteFromPin();
        });

        return _promise2.default.all([].concat(toSaveMediaPromise, toDeleteMediaPromise)).then(function () {
          return _this3;
        });
      });
      return _updateMSSQL(this, this.userId);
    }
  }, {
    key: 'delete',
    value: function _delete() {
      return _deleteMSSQL(this);
    }
  }, {
    key: 'setUser',
    value: function setUser(user) {
      this._user = user;
      this.userId = user.id;
      return this;
    }
  }, {
    key: 'addMedium',
    value: function addMedium(medium) {
      if (medium instanceof _model.Medium) {
        medium.setPin(this);
        this.media.push(medium);
      } else {
        throw "medium not instance of Medium";
      }
      return this;
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      // omits own and inherited properties with null values
      return _.omitBy(this, _.isNull);
    }
  }], [{
    key: 'queryById',
    value: function queryById(pinId, userId) {
      if (userId) {
        return _queryMSSQLPinWithFavoriteAndLikeById(pinId, userId);
      } else {
        return _queryMSSQLPinById(pinId);
      }
    }
  }, {
    key: 'delete',
    value: function _delete(id) {
      return new Pin({
        id: id
      }).delete();
    }
  }, {
    key: 'mapPinMedia',
    value: function mapPinMedia(pinRows) {
      var media = void 0,
          pin = new Pin(pinRows[0]);
      if (media = _mapMediaFromQuery(pinRows)) {
        pin.media = media;
      }
      return new Pin(pin);
    }
  }]);
  return Pin;
}();

exports.default = Pin;


function _mapMediaFromQuery(pinRows) {
  var media = [];

  pinRows.forEach(function (pinRow) {
    var mediaObj = {},
        hasProp = void 0;
    for (var prop in pinRow) {
      if (pinRow.hasOwnProperty(prop) && prop.startsWith('Media.')) {
        mediaObj[prop.substring(6)] = pinRow[prop];
        hasProp = true;
      }
    }
    if (hasProp && _model.Medium.isValid(mediaObj)) {
      media.push(mediaObj);
    }
  });

  if (media.length) {
    return media;
  }
  return undefined;
}

function _queryMSSQLPinWithFavoriteAndLikeById(pinId, userId) {
  return cp.getConnection().then(function (conn) {
    //console.log("queryMSSQLPinById then err", err)
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetPinWithFavoriteAndLike';
      var pin = void 0;
      var request = new mssql.Request(conn).input('pinId', mssql.Int, pinId).input('userId', mssql.Int, userId).execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        if (recordsets[0].length) {
          pin = Pin.mapPinMedia(recordsets[0]);
        } else {
          pin = undefined;
        }
        resolve({
          pin: pin
        });
      });
    });
  }).catch(function (err) {
    // ... connect error checks
    console.log("queryMSSQLPinById catch err", err);
  });
}

function _queryMSSQLPinById(pinId) {
  return cp.getConnection().then(function (conn) {
    //console.log("queryMSSQLPinById then err", err)
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetPin';
      var request = new mssql.Request(conn).input('pinId', mssql.Int, pinId).execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var pin = void 0;
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        if (recordsets[0].length) {
          pin = Pin.mapPinMedia(recordsets[0]);
        } else {
          pin = undefined;
        }
        resolve({
          pin: pin
        });
      });
    });
  }).catch(function (err) {
    // ... connect error checks
    console.log("queryMSSQLPinById catch err", err);
    throw err;
  });
}

function _createMSSQL(pin, userId) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'CreatePin';
      var request = new mssql.Request(conn).input('title', mssql.NVarChar(1024), pin.title).input('description', mssql.NVarChar(4000), pin.description).input('sourceUrl', mssql.NVarChar(4000), pin.sourceUrl).input('address', mssql.NVarChar(4000), pin.address).input('priceLowerBound', mssql.Decimal(18, 2), pin.priceLowerBound).input('priceUpperBound', mssql.Decimal(18, 2), pin.priceUpperBound).input('price', mssql.Decimal(18, 2), pin.price).input('tip', mssql.NVarChar(4000), pin.tip).input('utcStartDateTime', mssql.DateTime2(0), pin.utcStartDateTime).input('utcEndDateTime', mssql.DateTime2(0), pin.utcEndDateTime).input('allDay', mssql.Bit, pin.allDay).input('userId', mssql.Int, userId).input('utcCreatedDateTime', mssql.DateTime2(7), pin.utcCreatedDateTime).input('utcUpdatedDateTime', mssql.DateTime2(7), pin.utcUpdatedDateTime).input('utcDeletedDateTime', mssql.DateTime2(7), pin.utcDeletedDateTime).output('id', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var id = void 0;
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // ToDo: doesn't always return value
        try {
          //console.log('returnValue', returnValue); // always return 0
          pin.id = request.parameters.id.value;

          //console.log('queryCount', queryCount);
        } catch (e) {
          throw e;
        }

        resolve({
          pin: pin
        });
      });
    });
  });
}

function _updateMSSQL(pin, userId) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'UpdatePin';
      var request = new mssql.Request(conn).input('id', mssql.Int, pin.id).input('title', mssql.NVarChar(1024), pin.title).input('description', mssql.NVarChar(4000), pin.description).input('sourceUrl', mssql.NVarChar(4000), pin.sourceUrl).input('address', mssql.NVarChar(4000), pin.address).input('priceLowerBound', mssql.Decimal(18, 2), pin.priceLowerBound).input('priceUpperBound', mssql.Decimal(18, 2), pin.priceUpperBound).input('price', mssql.Decimal(18, 2), pin.price).input('tip', mssql.NVarChar(4000), pin.tip).input('utcStartDateTime', mssql.DateTime2(0), pin.utcStartDateTime).input('utcEndDateTime', mssql.DateTime2(0), pin.utcEndDateTime).input('allDay', mssql.Bit, pin.allDay).input('userId', mssql.Int, userId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        // Todo: updated date time need to be updated on model
        resolve({
          pin: pin
        });
      });
    });
  });
}

function _deleteMSSQL(pin) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'UpdatePin';
      var request = new mssql.Request(conn).input('id', mssql.Int, pin.id).output('utcDeletedDateTime', mssql.DateTime2(7));

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var utcDeletedDateTime = void 0;
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
        pin.utcDeletedDateTime = utcDeletedDateTime;
        resolve({
          utcDeletedDateTime: utcDeletedDateTime,
          pin: pin
        });
      });
    });
  });
}
//# sourceMappingURL=pin.js.map
