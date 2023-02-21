import title from './title';
import description from './description';
import image from './image';
import youtube from './youtube';
import price from './price';
import date from './date';
import $ from 'jquery';

(
  function combine() {
    var promiseObj = {};

    var titleRes = title();
    if (titleRes) {
      promiseObj.titles = titleRes;
    }

    var descriptionRes = description();
    if (descriptionRes) {
      promiseObj.descriptions = descriptionRes;
    }

    var imageRes = image();
    if (imageRes) {
      promiseObj.images = imageRes;
    }

    var priceRes = price();
    if (priceRes) {
      promiseObj.prices = priceRes;
    }

    var dateRes = date();
    if (dateRes) {
      promiseObj.dates = dateRes;
    }

    var youtubeRes = youtube();
    if (youtubeRes) {
      promiseObj.youtube = youtubeRes;
    }

    window.cpScrapePromise = Promise.all([titleRes, descriptionRes, imageRes, youtubeRes, priceRes, dateRes])
      .then(([titleRes, descriptionRes, imageRes, youtubeRes, priceRes, dateRes]) => {
        let res = {
          titles: titleRes,
          descriptions: descriptionRes,
          media: imageRes,
          youtube: youtubeRes,
          prices: priceRes,
          dates: dateRes
        };
        return res; // jshint ignore:line
      });

  }

)();
