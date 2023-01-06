import {
  uniqueAndNonEmpty
} from '../helper/util';

import {
  getMeta
} from '../helper/meta_tag';

import {
  getAttribute
} from '../helper/selector_attribute';

export default function description() {
  var res = [],
    meta = ['description', 'og:description'];

  var metaRes = getMeta(meta);
  if (metaRes) {
    res = res.concat(metaRes);
  }
  res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
}
