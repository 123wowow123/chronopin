import {
  uniqueAndNonEmpty
} from '../helper/util';

function clickToActivateLazyLoadFrames(youtubeEl) {
  for (let i = 0; i < youtubeEl.length; ++i) {
    let clickEvent = new MouseEvent("click", {
      "view": window,
      "bubbles": true,
      "cancelable": false
    });
    youtubeEl[i].dispatchEvent(clickEvent);
  }
}

export default function youtube() {
  var res = [],
    meta = ['iframe[src*="www.youtube.com"]'],
    clickBust = '.youtube'

  let youtubeEl = document.querySelectorAll(clickBust);
  clickToActivateLazyLoadFrames(youtubeEl);

  let frames = document.querySelectorAll(meta);
  for (let i = 0; i < frames.length; ++i) {
    let src = frames[i].src
    res.push(src);
  }

  res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
}
