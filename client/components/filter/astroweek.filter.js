'use strict';

(function() {

  angular.module('chronopinNodeApp')
    .filter('astroweek', function($filter) {
      const KEY_FORMAT = "EEE";

      /* https://docs.angularjs.org/api/ng/filter/date */
      const $dateFilter = $filter('date');
      /* http://www.fontspace.com/southype/astronomic-signs-st */
      /* https://cafeastrology.com/articles/daysoftheweek.html */
      /* https://www.tarot.com/astrology/planets-and-days-of-the-week */
      const DAY_OF_WEEK_TRANSLATION = [
        "The Sun",
        "The Moon",
        "Mars",
        "Mercury",
        "Jupiter",
        "Venus",
        "Saturn",
        ""
      ];

      return function abbreviateNumber(utcStartDateTime, format, timezone) {

        let week3LetterKey = $dateFilter(utcStartDateTime, KEY_FORMAT, timezone);
        let formatedDayOfWeek = $dateFilter(utcStartDateTime, format, timezone);

        let description;
        switch (week3LetterKey) {
          case "Sun":
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[0]} </br>${formatedDayOfWeek}</div>`;
            break;
          case "Mon":
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[1]} </br>${formatedDayOfWeek}</div>`;
            break;
          case "Tue":
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[2]} </br>${formatedDayOfWeek}</div>`;
            break;
          case "Wed":
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[3]} </br>${formatedDayOfWeek}</div>`;
            break;
          case "Thu":
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[4]} </br>${formatedDayOfWeek}</div>`;
            break;
          case "Fri":
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[5]} </br>${formatedDayOfWeek}</div>`;
            break;
          case "Sat":
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[6]} </br>${formatedDayOfWeek}</div>`;
            break;
          default:
            description = `<div class="text-center">${DAY_OF_WEEK_TRANSLATION[7]} </br>${formatedDayOfWeek}</div>`;
            break;
        }

        return description;

      };

    });

})();
