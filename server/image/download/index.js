import url from 'url';
import {
  encode,
  decode
} from 'node-base64-image';

export default function downloadImage(imgUrl) {
  //var options = url.parse(imgUrl);
  let promise = new Promise((resolve, reject) => {
    encode(imgUrl, undefined, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
  return promise;
}
