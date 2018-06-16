'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.downloadImage = undefined;
exports.createThumb = createThumb;
exports.saveThumb = saveThumb;

var _download = require('./download');

var _download2 = _interopRequireDefault(_download);

var _thumb = require('./thumb');

var thumb = _interopRequireWildcard(_thumb);

var _azureBlob = require('../azure-blob');

var azureBlob = _interopRequireWildcard(_azureBlob);

var _streamifier = require('../util/streamifier');

var _streamifier2 = _interopRequireDefault(_streamifier);

var _environment = require('../config/environment');

var _environment2 = _interopRequireDefault(_environment);

var _url = require('url');

var url = _interopRequireWildcard(_url);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _log = require('../log');

var log = _interopRequireWildcard(_log);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//pipe to sizeOf
//pipe to thumb
//pipe to check if name exist
//pipe to save azure blob
//pipe to save in Medium

var THUMB_OPTIONS = {
  width: _environment2.default.thumbWidth
};

function createThumb(imageUrl) {
  //create get image stream
  return (0, _download2.default)(imageUrl).then(function (buffer) {
    return thumb.shrink(buffer, THUMB_OPTIONS).then(function (newThumb) {
      return {
        buffer: buffer,
        thumbWidth: newThumb.width,
        thumbHeight: newThumb.height,

        originalUrl: imageUrl,
        originalWidth: newThumb.originalWidth,
        originalHeight: newThumb.originalHeight,
        type: newThumb.type,
        extention: _getExtention(imageUrl)
      };
    }).catch(function (err) {
      log.error('save-thumb error:', err);
      throw new Error(err);
    });
  });
}

function saveThumb(thumbObj) {
  var bufferLength = thumbObj.buffer.length,
      pageBlobSize = Math.ceil(bufferLength / 512) * 512,
      sf = _streamifier2.default.createReadStream(thumbObj.buffer);
  return azureBlob.createBlock(thumbObj.thumbName, sf, pageBlobSize, {
    contentSettings: {
      contentType: thumbObj.type //'image/png'
    }
  }).then(function () {
    return thumbObj;
  }).catch(function (err) {
    log.error('save-thumb error:', err);
    throw new Error(err);
  });
}

// https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504
function _getExtention(fname) {
  return path.extname(url.parse(fname).pathname); // '.jpg'
}

exports.downloadImage = _download2.default;
//# sourceMappingURL=index.js.map
