import {
  uniqueAndNonEmpty
} from '../helper/util';

export default function twitter() {
  var res = [],
    meta = ['iframe[data-tweet-id]'],
    meta2 = ['a[href*="twitter.com"']

  let frames = document.querySelectorAll(meta);
  for (let i = 0; i < frames.length; ++i) {
    let id = frames[i].dataset.tweetId;
    res.push(id);
  }

  let aTags = document.querySelectorAll(meta2);
  for (let i = 0; i < aTags.length; ++i) {
    let href = aTags[i].href;
    res.push(href);
  }

  res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
}
