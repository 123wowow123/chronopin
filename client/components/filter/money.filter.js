'use strict';

(function() {

  // Formats to: 0 999 -999 100k -100k 100M -100M 2.3k -2.3k
  // https://jsfiddle.net/xyug4nvz/7/

  angular.module('chronopinNodeApp')
    .filter('money', function() {

      let SI_POSTFIXES = ["", "K", "M", "B", "T", "P", "E"];

      return function abbreviateNumber(number, symbol) {
        symbol = symbol || '$';

        // what tier? (determines SI prefix)
        let tier = Math.log10(Math.abs(number)) / 3 | 0;

        // if zero, we don't need a prefix
        if (tier == 0) {
          return symbol + parseFloat(Math.round(number * 100) / 100).toFixed(2);
        }

        // get postfix and determine scale
        let postfix = SI_POSTFIXES[tier];
        let scale = Math.pow(10, tier * 3);

        // scale the number
        let scaled = number / scale;

        // format number and add postfix as suffix
        let formatted = scaled.toFixed(1) + '';

        // remove '.0' case
        if (/\.0$/.test(formatted))
          formatted = formatted.substr(0, formatted.length - 2);

        return symbol + formatted + postfix;
      };

    });

})();
