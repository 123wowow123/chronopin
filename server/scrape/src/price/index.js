import {
  uniqueAndNonEmpty
} from '../helper/util';

import $ from 'jquery';

export default function price() {
  var res = [],
    meta = ['[id*="article"], [id*="Article"], [id*="content"], [id*="Content"], [class*="article"], [class*="Article"], [class*="content"], [class*="Content"]'],
    text = [':contains("$")'],
    priceRegex = /\$(([1-9][0-9]{0,2}(,[0-9]{3})*|[0-9]+)(\.[0-9]{1,9})?)/;

  var $elements = $(meta)
    .find(text)
    .filter(function(index) {
      return priceRegex.test($(this).text());
    });

  $elements.each(function(index) {
    var match = priceRegex.exec($(this).text());
    res.push(match[1]);
  });

  res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
}
