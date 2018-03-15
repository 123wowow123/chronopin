import {
  uniqueAndNonEmpty
} from '../helper/util';

import {
  getMeta
} from '../helper/meta_tag';

import {
  getAttribute,
  getImageAttribute
} from '../helper/selector_attribute';

function preloader(url) {
  let imageObj = new Image();
  return new Promise((resolve, reject) => {
    imageObj.onload = pe => {
      resolve({
        originalUrl: url,
        height: imageObj.naturalHeight,
        width: imageObj.naturalWidth
      });
    }
    imageObj.error = err => {
      console.log('Phantom: preloader:', err);
      reject(err);
    }
    imageObj.src = url;
  });
}

function getImageSizes(images) {
  let imagePromises = images.map(imageUrl => {
    return preloader(imageUrl)
      .then(image => {
        return image;
      })
      .catch(err => {
        //console.log('Phantom: getImageSizes:', err);
        var image = {
          sourceUrl: imageUrl,
          width: 0,
          height: 0
        };
        return image;
      });
  });

  return Promise.all(imagePromises);
}

export default function image() {
  var res = [],
    meta = ['og:image'],
    tagAttribute = [{
      selector: "[id*='article'] img, [id*='Article'] img, [class*='article'] img, [class*='Article'] img",
      attribute: "src"
    }, {
      selector: "[id*='content'] img, [id*='Content'] img, [class*='content'] img, [class*='Content'] img",
      attribute: "src"
    }];

  var metaRes = getMeta(meta);
  if (metaRes) {
    res = res.concat(metaRes);
  }

  var attributeRes = getImageAttribute(tagAttribute);
  if (attributeRes) {
    res = res.concat(attributeRes);
  }

  res = uniqueAndNonEmpty(res);

  if (res.length) {
    res = getImageSizes(res);
  }
  return res.length || res.then ? res : undefined;
}
