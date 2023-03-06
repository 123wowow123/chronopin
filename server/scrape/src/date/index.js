// import {
//   uniqueAndNonEmpty
// } from '../helper/util';

//need to add weight to date and sort by weight

import $ from 'jquery';
import * as chrono from 'chrono-node';
import {
  uniqueAndNonEmpty
} from '../helper/util';

export default function date() {
  var res = [];
  //meta = ['[class*="article"], [class*="Article"], [class*="content"], [class*="Content"]'],
  //not = '[class*="comment"], [class*="Comment"]'

  var precedingWords = [''];
  var yearRegex = "^(19|20)\d{2}$" //1900-2099

  var jQuery = $;

  var text = jQuery('[id*="article"], [id*="Article"], [id*="content"], [id*="Content"], [class*="article"], [class*="Article"], [class*="content"], [class*="Content"], strong')
    .clone()
    .find('[id*="comment"], [id*="Comment"], [class*="comment"], [class*="Comment"], strong')
    .remove()
    .end()
    .text();

  var result = chrono.parse(text);
  // Todo: reset hour min so on ??
  result = result.map(function (chronoObj) {
    var dateTime = {};
    dateTime.start = chronoObj.start.date().toISOString();
    var end = chronoObj.end;
    if (end) {
      dateTime.end = end.date().toISOString();
      dateTime.allDay = false;
    } else {
      dateTime.end = chronoObj.start.date().toISOString();
      dateTime.allDay = true;
    }
    return dateTime;
  });

  res = uniqueAndNonEmpty(result);
  return res.length ? res : undefined;
}
