'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = price;

var _util = require('../helper/util');

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function price() {
  var res = [],
      meta = ['[id*="article"], [id*="Article"], [id*="content"], [id*="Content"], [class*="article"], [class*="Article"], [class*="content"], [class*="Content"]'],
      text = [':contains("$")'],
      priceRegex = /\$(([1-9][0-9]{0,2}(,[0-9]{3})*|[0-9]+)(\.[0-9]{1,9})?)/;

  var $elements = (0, _jquery2.default)(meta).find(text).filter(function (index) {
    return priceRegex.test((0, _jquery2.default)(this).text());
  });

  $elements.each(function (index) {
    var match = priceRegex.exec((0, _jquery2.default)(this).text());
    res.push(match[1]);
  });

  res = (0, _util.uniqueAndNonEmpty)(res);
  return res.length ? res : undefined;
}
//# sourceMappingURL=index.js.map
