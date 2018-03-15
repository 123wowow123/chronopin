'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMeta = getMeta;

var _util = require('../util');

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getMetaAttributeByName(name) {
  var key = ['name', 'property'];
  var value = 'content';

  var match = (0, _jquery2.default)('meta[' + key[0] + '="' + name + '"], meta[' + key[1] + '="' + name + '"]');
  if (match.get().length > 0) {
    return match.map(function () {
      return (0, _jquery2.default)(this).attr(value).trim();
    }).get();
  }
  return undefined;
}

function getMeta(metas) {
  var scraped = [];
  metas.forEach(function (name) {
    var content = _getMetaAttributeByName(name);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = (0, _util.uniqueAndNonEmpty)(scraped);
  return scraped.length ? scraped : undefined;
}
//# sourceMappingURL=index.js.map
