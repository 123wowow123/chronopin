// What the page's own markup can give that reading its text cannot: images
// with real dimensions, and embedded YouTube/Twitter media. The title,
// description, price and date extractors that used to live here were
// replaced by the single LLM pass in server/extract.
import image from './image';
import youtube from './youtube';
import twitter from './twitter';

(
  function combine() {

    window.cpScrapePromise = new Promise(function (resolve, reject) {

      var imageRes = image();

      var youtubeRes = youtube();

      var twitterRes = twitter();

      Promise.all([imageRes, youtubeRes, twitterRes])
        .then(([imageRes, youtubeRes, twitterRes]) => {
          let res = {
            media: imageRes,
            youtube: youtubeRes,
            twitter: twitterRes
          };
          return res; // jshint ignore:line
        })
        .then(resolve)
        .catch(reject);
    });
}

)();
