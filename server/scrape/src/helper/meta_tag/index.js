import {
  uniqueAndNonEmpty
} from '../util';
import $ from 'jquery';

function _getMetaAttributeByName(name) {
  var key = ['name', 'property'];
  var value = 'content';

  var match = $(`meta[${key[0]}="${name}"], meta[${key[1]}="${name}"]`);
  if (match.get().length > 0) {
    return match.map(function() {
      return $(this).attr(value).trim();
    }).get();
  }
  return undefined;
}

export function getMeta(metas) {
  var scraped = [];
  metas.forEach(function(name) {
    let content = _getMetaAttributeByName(name);
    if (content) {
      scraped = scraped.concat(content);
    }
  });
  scraped = uniqueAndNonEmpty(scraped);
  return scraped.length ? scraped : undefined;
}
