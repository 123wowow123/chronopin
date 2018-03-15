"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uniqueAndNonEmpty = uniqueAndNonEmpty;
function _onlyUniqueAndNonEmpty(value, index, self) {
  return value && self.indexOf(value) === index;
}

function uniqueAndNonEmpty(strings) {
  return strings.filter(_onlyUniqueAndNonEmpty);
}
//# sourceMappingURL=index.js.map
