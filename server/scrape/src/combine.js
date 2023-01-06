import title from './title';
import description from './description';
import image from './image';
import price from './price';
import date from './date';
import $ from 'jquery';

(
  function combine() {
    var res = {};

    var titleRes = title();
    if (titleRes) {
      res.titles = titleRes;
    }

    var descriptionRes = description();
    if (descriptionRes) {
      res.descriptions = descriptionRes;
    }

    var imageRes = image();
    if (imageRes) {
      res.images = imageRes;
    }

    var priceRes = price();
    if (priceRes) {
      res.prices = priceRes;
    }

    var dateRes = date();
    if (dateRes) {
      res.dates = dateRes;
    }

    window.cpScrapePromise = Promise.all([titleRes, descriptionRes, imageRes, priceRes, dateRes])
      .then(([titleRes, descriptionRes, imageRes, priceRes, dateRes]) => {
        let res = {
          titles: titleRes,
          descriptions: descriptionRes,
          media: imageRes,
          prices: priceRes,
          dates: dateRes
        };
        return res; // jshint ignore:line
      });

  }

)();
