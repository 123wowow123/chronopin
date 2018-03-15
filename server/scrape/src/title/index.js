'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = title;

var _util = require('../helper/util');

var _meta_tag = require('../helper/meta_tag');

var _selector_text = require('../helper/selector_text');

function title() {
  var res = [],
      meta = ['og:title', 'title'],
      text = ['h1'];

  var metaRes = (0, _meta_tag.getMeta)(meta);
  if (metaRes) {
    res = res.concat(metaRes);
  }

  var nameRes = (0, _selector_text.getText)(text);
  if (nameRes) {
    res = res.concat(nameRes);
  }

  res = (0, _util.uniqueAndNonEmpty)(res);
  return res.length ? res : undefined;
}
//# sourceMappingURL=index.js.map
