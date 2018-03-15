'use strict';

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _title = require('./title');

var _title2 = _interopRequireDefault(_title);

var _description = require('./description');

var _description2 = _interopRequireDefault(_description);

var _image = require('./image');

var _image2 = _interopRequireDefault(_image);

var _price = require('./price');

var _price2 = _interopRequireDefault(_price);

var _date = require('./date');

var _date2 = _interopRequireDefault(_date);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function combine() {
  var res = {};

  var titleRes = (0, _title2.default)();
  if (titleRes) {
    res.titles = titleRes;
  }

  var descriptionRes = (0, _description2.default)();
  if (descriptionRes) {
    res.descriptions = descriptionRes;
  }

  var imageRes = (0, _image2.default)();
  if (imageRes) {
    res.images = imageRes;
  }

  var priceRes = (0, _price2.default)();
  if (priceRes) {
    res.prices = priceRes;
  }

  var dateRes = (0, _date2.default)();
  if (dateRes) {
    res.dates = dateRes;
  }

  window.cpScrapePromise = _promise2.default.all([titleRes, descriptionRes, imageRes, priceRes, dateRes]).then(function (_ref) {
    var _ref2 = (0, _slicedToArray3.default)(_ref, 5),
        titleRes = _ref2[0],
        descriptionRes = _ref2[1],
        imageRes = _ref2[2],
        priceRes = _ref2[3],
        dateRes = _ref2[4];

    var res = {
      titles: titleRes,
      descriptions: descriptionRes,
      media: imageRes,
      prices: priceRes,
      dates: dateRes
    };
    return res; // jshint ignore:line
  });
})();
//# sourceMappingURL=combine.js.map
