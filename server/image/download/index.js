import fetch from 'node-fetch';

// Wikimedia's CDN (thumb.wikimedia.org, and others) 403s any request with no
// User-Agent. A browser-like UA is enough to pass.
const DOWNLOAD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Chronopin/1.0)'
};

export default function downloadImage(imgUrl) {
  return fetch(imgUrl, { headers: DOWNLOAD_HEADERS })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Image download failed with ${res.status}: ${imgUrl}`);
      }
      return res.buffer();
    });
}
