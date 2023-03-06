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

function recursiveWalk(node, func) {
  var done = func(node);
  if (done) {
    return true;
  }

  if ('shadowRoot' in node && node.shadowRoot && 'querySelectorAll' in node && node.querySelectorAll) {
    var done = recursiveWalk(node.shadowRoot, func);
    if (done) {
      return true;
    }
  }
  node = node.firstChild;

  while (node) {
    var done = recursiveWalk(node, func);
    if (done) {
      return true;
    }
    node = node.nextSibling;
  }
}

export default function youtube() {
  var res = [],
    srcMatch = "www.youtube.com",
    meta = ['iframe[src*="www.youtube.com"]'],
    clickBust = '.youtube';

  let youtubeEl = document.querySelectorAll(clickBust);
  clickToActivateLazyLoadFrames(youtubeEl);

  recursiveWalk(document.body, function (node) {
    if (node.src && node.contentWindow && node.src.includes(srcMatch)) {
      //console.log('iframe src', node.src)
      let src = node.src;
      res.push(src);
    }
  });

  res = uniqueAndNonEmpty(res);
  return res.length ? res : undefined;
}
