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

var _image = require('../../image');

var image = _interopRequireWildcard(_image);

var _model = require('../../model');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uuidv4 = require('uuid/v4');


// _pin
var prop = ['id', 'thumbName', 'thumbWidth', 'thumbHeight', 'originalUrl', 'originalWidth', 'originalHeight', 'type', 'utcCreatedDateTime', 'utcDeletedDateTime'];

var Medium = function () {
  function Medium(medium, pin) {
    (0, _classCallCheck3.default)(this, Medium);

    Object.defineProperty(this, '_pin', {
      enumerable: false,
      configurable: false,
      writable: true
    });

    if (medium) {
      this.set(medium, pin);
    }
  }

  (0, _createClass3.default)(Medium, [{
    key: 'set',
    value: function set(medium, pin) {
      if (medium) {
        for (var i = 0; i < prop.length; i++) {
          this[prop[i]] = medium[prop[i]];
        }

        if (pin instanceof _model.Pin) {
          this._pin = pin;
        }
      } else {
        throw "medium cannot set value of arg";
      }

      return this;
    }
  }, {
    key: 'save',
    value: function save() {
      var _this = this;

      return Medium.getByOriginalUrl(this.originalUrl).then(function (_ref) {
        var medium = _ref.medium;

        if (medium) {
          // share existing Medium to save thumb space and better analytics
          // no modification needed and just reuse db medium;
          _this.set(medium);
          return _createPinMediumMSSQL(_this, _this._pin.id).then(function (newMedium) {
            return _this.set(newMedium);
          });
        } else {
          return _createMSSQL(_this, _this._pin.id);
        }
      });
    }
  }, {
    key: 'createAndSaveToCDN',
    value: function createAndSaveToCDN() {
      var _this2 = this;

      return _getImageStat(this.originalUrl).then(function (newMedium) {
        // console.log('createAndSaveToCDN', newMedium);
        return _this2.set(newMedium).save();
      });
    }
  }, {
    key: 'deleteFromPin',
    value: function deleteFromPin() {
      return _deleteFromPinMSSQL(this, this._pin.id);
    }
  }, {
    key: 'setPin',
    value: function setPin(pin) {
      this._pin = pin;
      return this;
    }
  }], [{
    key: 'getByOriginalUrl',
    value: function getByOriginalUrl(originalUrl) {
      return _getMediumByOriginalUrlMSSQL(originalUrl);
    }
  }, {
    key: 'createAndSaveToCDN',
    value: function createAndSaveToCDN(originalUrl) {
      return new Medium({
        originalUrl: originalUrl
      }).createAndSaveToCDN();
    }
  }, {
    key: 'isValid',
    value: function isValid(medium) {
      for (var i = 0; i < prop.length; i++) {
        if (medium.originalUrl) {
          return true;
        }
      }
      return false;
    }
  }]);
  return Medium;
}();

exports.default = Medium;


function _createMSSQL(medium, pinId) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'CreatePinMediumLink';
      var request = new mssql.Request(conn).input('pinId', mssql.Int, pinId).input('thumbName', mssql.NVarChar(4000), medium.thumbName).input('thumbWidth', mssql.Int, medium.thumbWidth).input('thumbHeight', mssql.Int, medium.thumbHeight).input('originalUrl', mssql.NVarChar(4000), medium.originalUrl).input('originalWidth', mssql.Int, medium.originalWidth).input('originalHeight', mssql.Int, medium.originalHeight).input('type', mssql.VarChar(255), medium.type).input('utcCreatedDateTime', mssql.DateTime2(7), medium.utcCreatedDateTime).input('utcDeletedDateTime', mssql.DateTime2(7), medium.utcDeletedDateTime).output('id', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var queryCount = void 0,
            id = void 0;
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
        medium.id = id;
        resolve({
          medium: medium
        });
      });
    });
  });
}

function _createPinMediumMSSQL(medium, pinId) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'CreatePinMedium';

      var request = new mssql.Request(conn).input('pinId', mssql.Int, pinId).input('mediumId', mssql.Int, medium.id).input('utcCreatedDateTime', mssql.DateTime2(7), medium.utcCreatedDateTime).input('utcDeletedDateTime', mssql.DateTime2(7), medium.utcDeletedDateTime).output('id', mssql.Int);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        var queryCount = void 0,
            id = void 0;
        //console.log('GetPinsWithFavoriteAndLikeNext', recordsets[0]);
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }

        resolve({
          medium: medium
        });
      });
    });
  });
}

function _getImageStat(imageUrl) {
  var thumbNameGuid = uuidv4();
  return image.createThumb(imageUrl).then(function (thumbBufferAndMeta) {
    // console.log('_getImageStat', thumbBufferAndMeta);
    var newMedium = {
      buffer: thumbBufferAndMeta.buffer,
      thumbName: thumbNameGuid + thumbBufferAndMeta.extention,
      thumbWidth: thumbBufferAndMeta.thumbWidth,
      thumbHeight: thumbBufferAndMeta.thumbHeight,

      originalUrl: thumbBufferAndMeta.originalUrl,
      originalWidth: thumbBufferAndMeta.originalWidth,
      originalHeight: thumbBufferAndMeta.originalHeight,
      type: thumbBufferAndMeta.type // change to mimeType
      //type: 'Image' // do we need this?
    };
    return newMedium;
  }).then(function (newMedium) {
    return image.saveThumb(newMedium);
  });
}

function _deleteFromPinMSSQL(medium, pinId) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'DeletePinMediumByPinMediumId';
      var request = new mssql.Request(conn)
      // fb public attributes
      .input('pinId', mssql.Int, pinId).input('mediumId', mssql.Int, medium.id).output('utcDeletedDateTime', mssql.DateTime2(7));

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
        resolve({
          utcDeletedDateTime: utcDeletedDateTime,
          medium: medium
        });
      });
    });
  });
}

function _getMediumByOriginalUrlMSSQL(originalUrl) {
  return cp.getConnection().then(function (conn) {
    return new _promise2.default(function (resolve, reject) {
      var StoredProcedureName = 'GetMediumByOriginalUrl';
      var medium = void 0;
      var request = new mssql.Request(conn).input('originalUrl', mssql.NVarChar, originalUrl);

      //console.log('GetPinsWithFavoriteAndLikeNext', offset, pageSize, userId, fromDateTime, lastPinId);

      request.execute('[dbo].[' + StoredProcedureName + ']', function (err, recordsets, returnValue, affected) {
        if (err) {
          reject('execute [dbo].[' + StoredProcedureName + '] err: ' + err);
        }
        if (recordsets[0].length) {
          medium = new Medium(recordsets[0] && recordsets[0][0]);
        } else {
          medium = undefined;
        }
        resolve({
          medium: medium
        });
      });
    });
  });
}
//# sourceMappingURL=medium.js.map
