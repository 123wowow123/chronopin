'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.default = image;

var _util = require('../helper/util');

var _meta_tag = require('../helper/meta_tag');

var _selector_attribute = require('../helper/selector_attribute');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function preloader(url) {
  var imageObj = new Image();
  return new _promise2.default(function (resolve, reject) {
    imageObj.onload = function (pe) {
      resolve({
        originalUrl: url,
        height: imageObj.naturalHeight,
        width: imageObj.naturalWidth
      });
    };
    imageObj.error = function (err) {
      console.log('Phantom: preloader:', err);
      reject(err);
    };
    imageObj.src = url;
  });
}

function getImageSizes(images) {
  var imagePromises = images.map(function (imageUrl) {
    return preloader(imageUrl).then(function (image) {
      return image;
    }).catch(function (err) {
      //console.log('Phantom: getImageSizes:', err);
      var image = {
        sourceUrl: imageUrl,
        width: 0,
        height: 0
      };
      return image;
    });
  });

  return _promise2.default.all(imagePromises);
}

function image() {
  var res = [],
      meta = ['og:image'],
      tagAttribute = [{
    selector: "[id*='article'] img, [id*='Article'] img, [class*='article'] img, [class*='Article'] img",
    attribute: "src"
  }, {
    selector: "[id*='content'] img, [id*='Content'] img, [class*='content'] img, [class*='Content'] img",
    attribute: "src"
  }];

  var metaRes = (0, _meta_tag.getMeta)(meta);
  if (metaRes) {
    res = res.concat(metaRes);
  }

  var attributeRes = (0, _selector_attribute.getImageAttribute)(tagAttribute);
  if (attributeRes) {
    res = res.concat(attributeRes);
  }

  res = (0, _util.uniqueAndNonEmpty)(res);

  if (res.length) {
    res = getImageSizes(res);
  }
  return res.length || res.then ? res : undefined;
}
//# sourceMappingURL=index.js.map
