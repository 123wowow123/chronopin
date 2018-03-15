'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getText = getText;

var _util = require('../util');

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _scrapeText(selector) {
  var match = (0, _jquery2.default)(selector);
  if (match.get().length > 0) {
    return match.map(function () {
      return (0, _jquery2.default)(this).text().trim();
    }).get();
  }
  return undefined;
}

function getText(selectors) {
  var scraped = [];
  selectors.forEach(function (selector) {
    var content = _scrapeText(selector);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = (0, _util.uniqueAndNonEmpty)(scraped);
  //return ['123'];
  return scraped.length ? scraped : undefined;
}
//# sourceMappingURL=index.js.map
