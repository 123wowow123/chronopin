import {
  uniqueAndNonEmpty
} from '../util';
import $ from 'jquery';

function _scrapeText(selector) {
  var match = $(selector);
  if (match.get().length > 0) {
    return match.map(function() {
      return $(this).text().trim();
    }).get();
  }
  return undefined;
}

export function getText(selectors) {
  var scraped = [];
  selectors.forEach(function(selector) {
    let content = _scrapeText(selector);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = uniqueAndNonEmpty(scraped);
  //return ['123'];
  return scraped.length ? scraped : undefined;
}
