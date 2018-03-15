'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAttribute = getAttribute;
exports.getImageAttribute = getImageAttribute;

var _util = require('../util');

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _scrapeAttribute(selector, attribute) {
  var match = (0, _jquery2.default)(selector);
  if (match.get().length > 0) {
    return match.map(function () {
      return (0, _jquery2.default)(this).attr(attribute);
    }).get();
  }
  return undefined;
}

function _scrapeImageAttribute(selector, attribute) {
  var match = (0, _jquery2.default)(selector);
  if (match.get().length > 0) {
    return match.map(function () {
      if (attribute === 'src') {
        return (0, _jquery2.default)(this).get(0).src;
      } else {
        return (0, _jquery2.default)(this).attr(attribute);
      }
    }).get();
  }
  return undefined;
}

function getAttribute(selectorsPairs) {
  var scraped = [];
  selectorsPairs.forEach(function (selectorsPair) {
    var content = _scrapeAttribute(selectorsPair.selector, selectorsPair.attribute);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = (0, _util.uniqueAndNonEmpty)(scraped);
  return scraped.length ? scraped : undefined;
}

function getImageAttribute(selectorsPairs) {
  var scraped = [];
  selectorsPairs.forEach(function (selectorsPair) {
    var content = _scrapeImageAttribute(selectorsPair.selector, selectorsPair.attribute);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = (0, _util.uniqueAndNonEmpty)(scraped);
  return scraped.length ? scraped : undefined;
}
//# sourceMappingURL=index.js.map
