'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = description;

var _util = require('../helper/util');

var _meta_tag = require('../helper/meta_tag');

var _selector_attribute = require('../helper/selector_attribute');

function description() {
  var res = [],
      meta = ['description', 'og:description'];

  var metaRes = (0, _meta_tag.getMeta)(meta);
  if (metaRes) {
    res = res.concat(metaRes);
  }
  res = (0, _util.uniqueAndNonEmpty)(res);
  return res.length ? res : undefined;
}
//# sourceMappingURL=index.js.map
