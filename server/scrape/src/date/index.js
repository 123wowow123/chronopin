'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = date;

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _chronoNode = require('chrono-node');

var _chronoNode2 = _interopRequireDefault(_chronoNode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function date() {
  var res = [];
  //meta = ['[class*="article"], [class*="Article"], [class*="content"], [class*="Content"]'],
  //not = '[class*="comment"], [class*="Comment"]'

  var precedingWords = [''];
  var yearRegex = "^(19|20)\d{2}$"; //1900-2099

  var jQuery = _jquery2.default;

  var text = jQuery('[id*="article"], [id*="Article"], [id*="content"], [id*="Content"], [class*="article"], [class*="Article"], [class*="content"], [class*="Content"]').clone().find('[id*="comment"], [id*="Comment"], [class*="comment"], [class*="Comment"]').remove().end().text();

  var result = _chronoNode2.default.parse(text);

  // Todo: reset hour min so on ??
  result = result.map(function (chronoObj) {
    var dateTime = {};
    dateTime.start = chronoObj.start.date();
    var end = chronoObj.end;
    if (end) {
      dateTime.end = end.date();
      dateTime.allDay = false;
    } else {
      dateTime.end = chronoObj.start.date();
      dateTime.allDay = true;
    }
    return dateTime;
  });

  res = _lodash2.default.uniqBy(result, _lodash2.default.isEqual);

  //res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
} // import {
//   uniqueAndNonEmpty
// } from '../helper/util';

//need to add weight to date and sort by weight
//# sourceMappingURL=index.js.map
