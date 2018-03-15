'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = downloadImage;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _nodeBase64Image = require('node-base64-image');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function downloadImage(imgUrl) {
  var options = _url2.default.parse(imgUrl);
  var promise = new _promise2.default(function (resolve, reject) {
    (0, _nodeBase64Image.encode)(imgUrl, undefined, function (err, res) {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
  return promise;
}
//# sourceMappingURL=index.js.map
