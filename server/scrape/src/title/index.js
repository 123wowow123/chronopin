import {
  uniqueAndNonEmpty
} from '../helper/util';

import {
  getMeta
} from '../helper/meta_tag';

import {
  getText
} from '../helper/selector_text';

export default function title() {
  var res = [],
    meta = ['og:title', 'title'],
    text = ['h1'];

  var metaRes = getMeta(meta);
  if (metaRes) {
    res = res.concat(metaRes);
  }

  var nameRes = getText(text);
  if (nameRes) {
    res = res.concat(nameRes);
  }

  res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
}
