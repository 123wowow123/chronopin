import title from './title';
import description from './description';
import image from './image';
import youtube from './youtube';
import twitter from './twitter';
import price from './price';
import date from './date';
import $ from 'jquery';

(
  function combine() {

    window.cpScrapePromise = new Promise(function (resolve, reject) {

      var titleRes = title();

      var descriptionRes = description();

      var imageRes = image();

      var priceRes = price();

      var dateRes = date();

      var youtubeRes = youtube();

      var twitterRes = twitter();

      Promise.all([titleRes, descriptionRes, imageRes, youtubeRes, twitterRes, priceRes, dateRes])
        .then(([titleRes, descriptionRes, imageRes, youtubeRes, twitterRes, priceRes, dateRes]) => {
          let res = {
            titles: titleRes,
            descriptions: descriptionRes,
            media: imageRes,
            youtube: youtubeRes,
            twitter: twitterRes,
            prices: priceRes,
            dates: dateRes
          };
          return res; // jshint ignore:line
        })
        .then(resolve)
        .catch(reject);
    });
}

)();
