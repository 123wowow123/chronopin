import {
  uniqueAndNonEmpty
} from '../util';
import $ from 'jquery';

function _scrapeAttribute(selector, attribute) {
  var match = $(selector);
  if (match.get().length > 0) {
    return match.map(function() {
      return $(this).attr(attribute);
    }).get();
  }
  return undefined;
}

function _scrapeImageAttribute(selector, attribute) {
  var match = $(selector);
  if (match.get().length > 0) {
    return match.map(function() {
      if (attribute === 'src') {
        return $(this).get(0).src;
      } else {
        return $(this).attr(attribute);
      }

    }).get();
  }
  return undefined;
}

export function getAttribute(selectorsPairs) {
  var scraped = [];
  selectorsPairs.forEach(function(selectorsPair) {
    let content = _scrapeAttribute(selectorsPair.selector, selectorsPair.attribute);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = uniqueAndNonEmpty(scraped);
  return scraped.length ? scraped : undefined;
}

export function getImageAttribute(selectorsPairs) {
  var scraped = [];
  selectorsPairs.forEach(function(selectorsPair) {
    let content = _scrapeImageAttribute(selectorsPair.selector, selectorsPair.attribute);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = uniqueAndNonEmpty(scraped);
  return scraped.length ? scraped : undefined;
}
