import url from 'url';
import {
  encode,
  decode
} from 'node-base64-image';

// Wikimedia's CDN (thumb.wikimedia.org, and others) 403s any request with no
// User-Agent - which is what encode() sends by default, since it hands
// axios's own request through unheaded. A browser-like UA is enough to pass.
const DOWNLOAD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Chronopin/1.0)'
};

export default function downloadImage(imgUrl) {
  //var options = url.parse(imgUrl);
  return encode(imgUrl, { headers: DOWNLOAD_HEADERS });
}
