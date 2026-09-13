'use strict';

(function() {

  // Formats to: 0 999 -999 100k -100k 100M -100M 2.3k -2.3k
  // https://jsfiddle.net/xyug4nvz/7/

  angular.module('chronopinNodeApp')
    .filter('money', function() {

      let SI_POSTFIXES = ["", "K", "M", "B", "T", "P", "E"];

      // ISO 4217 code -> what to print in front of the figure. A code that is
      // not listed prints as itself ("AED 128B"), which is the honest reading
      // for a currency with no widely recognised symbol - and far better than
      // the "$" this used to hardcode, which mislabelled every non-dollar
      // figure on the site.
      let CURRENCY_SYMBOLS = {
        USD: '$', EUR: '€', GBP: '£', JPY: '¥', CNY: 'CN¥',
        INR: '₹', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', HKD: 'HK$',
        SGD: 'S$', KRW: '₩', RUB: '₽', BRL: 'R$', MXN: 'MX$',
        TRY: '₺', ILS: '₪', THB: '฿', TWD: 'NT$', PHP: '₱',
        VND: '₫', NGN: '₦', SEK: 'kr', NOK: 'kr', DKK: 'kr'
      };

      return function abbreviateNumber(number, currency) {
        // No currency recorded means the old dollar-only data, which was all
        // USD product prices.
        let symbol = currency ? (CURRENCY_SYMBOLS[currency] || currency) : '$';
        // "AED 128B" and "kr 52.6B" need the gap; "A$27B" and "€6.4B" do not.
        if (/[A-Za-z]$/.test(symbol)) {
          symbol = symbol + ' ';
        }

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
