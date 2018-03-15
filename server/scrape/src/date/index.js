// import {
//   uniqueAndNonEmpty
// } from '../helper/util';

//need to add weight to date and sort by weight

import $ from 'jquery';
import _ from 'lodash';
import chrono from 'chrono-node';

export default function date() {
  var res = [];
  //meta = ['[class*="article"], [class*="Article"], [class*="content"], [class*="Content"]'],
  //not = '[class*="comment"], [class*="Comment"]'

  var precedingWords = [''];
  var yearRegex = "^(19|20)\d{2}$" //1900-2099

  var jQuery = $;

  var text = jQuery('[id*="article"], [id*="Article"], [id*="content"], [id*="Content"], [class*="article"], [class*="Article"], [class*="content"], [class*="Content"]')
    .clone()
    .find('[id*="comment"], [id*="Comment"], [class*="comment"], [class*="Comment"]')
    .remove()
    .end()
    .text();

  var result = chrono.parse(text);

  // Todo: reset hour min so on ??
  result = result.map(function(chronoObj) {
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

  res = _.uniqBy(result, _.isEqual);

  //res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
}
