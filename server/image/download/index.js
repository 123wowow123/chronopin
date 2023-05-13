import url from 'url';
import {
  encode,
  decode
} from 'node-base64-image';

export default function downloadImage(imgUrl) {
  //var options = url.parse(imgUrl);
  return encode(imgUrl, undefined);
}
