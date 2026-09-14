'use strict';

(function () {

  /**
   * The Util service is for thin, globally reusable, utility functions
   */
  function UtilService($window, appConfig) {

    const Util = {

      /**
       * Return a callback or noop function
       *
       * @param  {Function|*} cb - a 'potential' function
       * @return {Function}
       */
      safeCb(cb) {
        return angular.isFunction(cb) ? cb : angular.noop;
      },

      /**
       * Parse a given url with the use of an anchor element
       *
       * @param  {String} url - the url to parse
       * @return {Object}     - the parsed url, anchor element
       */
      urlParse(url) {
        var a = document.createElement('a');
        a.href = url;

        // Special treatment for IE, see http://stackoverflow.com/a/13405933 for details
        if (a.host === '') {
          a.href = a.href;
        }

        return a;
      },

      /**
       * Test whether or not a given url is same origin
       *
       * @param  {String}           url       - url to test
       * @param  {String|String[]}  [origins] - additional origins to test against
       * @return {Boolean}                    - true if url is same origin
       */
      isSameOrigin(url, origins) {
        url = Util.urlParse(url);
        origins = origins && [].concat(origins) || [];
        origins = origins.map(Util.urlParse);
        origins.push($window.location);
        origins = origins.filter(function (o) {
          let hostnameCheck = url.hostname === o.hostname;
          let protocolCheck = url.protocol === o.protocol;
          // 2nd part of the special treatment for IE fix (see above): 
          // This part is when using well-known ports 80 or 443 with IE,
          // when $window.location.port==='' instead of the real port number.
          // Probably the same cause as this IE bug: https://goo.gl/J9hRta
          let portCheck = url.port === o.port || o.port === '' && (url.port === '80' || url
            .port === '443');
          return hostnameCheck && protocolCheck && portCheck;
        });
        return origins.length >= 1;
      },

      getLinkHeader(omitLinkHeaderProp, linkHeader, key) {
        return linkHeader && _.omit(linkHeader[key], omitLinkHeaderProp);
      },

      sanitizeSearchChoice(searchChoice) {
        const defaultChoice = appConfig.searchChoices[0];
        if (!searchChoice) {
          return defaultChoice;
        }
        const searchChoiceLower = searchChoice.toLowerCase();
        let found = appConfig.searchChoices.find(t => {
          return t.value === searchChoiceLower;
        })
        return found || defaultChoice;
      },

      defaultSearchChoice() {
        return appConfig.searchChoices[0];
      },

      /**
       * All-day pins are stored as whole UTC days: the start at 00:00Z of the
       * first day, the end (optional, exclusive) at 00:00Z of the day after
       * the last. Date pickers, the timeline and countdowns work in the
       * viewer's local time, so these convert between the two.
       */

      // The viewer's local midnight on the UTC calendar date of dateTime.
      utcDayToLocalDate(dateTime) {
        if (!dateTime) {
          return dateTime;
        }
        const d = new Date(dateTime);
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      },

      // 00:00Z on the local calendar date of dateTime, plus addDays days.
      localDateToUtcDay(dateTime, addDays) {
        if (!dateTime) {
          return dateTime;
        }
        const d = new Date(dateTime);
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + (addDays || 0)));
      },

      // When a pin starts on the viewer's clock: its instant, or for an
      // all-day pin local midnight of its date.
      pinLocalStart(pin) {
        const start = pin && pin.utcStartDateTime && new Date(pin.utcStartDateTime);
        return start && pin.allDay ? Util.utcDayToLocalDate(start) : start;
      },

      // The start/end a pin form edits. An all-day pin's exclusive end
      // becomes its last day, and is dropped when that is the start day.
      pinToFormDates(pin) {
        const start = pin.utcStartDateTime ? new Date(pin.utcStartDateTime) : undefined;
        let end = pin.utcEndDateTime ? new Date(pin.utcEndDateTime) : undefined;
        if (!pin.allDay) {
          return { start, end };
        }
        const localStart = Util.utcDayToLocalDate(start);
        let lastDay = end && Util.utcDayToLocalDate(end);
        if (lastDay) {
          lastDay.setDate(lastDay.getDate() - 1);
          if (!localStart || lastDay <= localStart) {
            lastDay = undefined;
          }
        }
        return { start: localStart, end: lastDay };
      },

      // The utcStartDateTime/utcEndDateTime a pin form submits, from the
      // local dates its pickers hold.
      formDatesToPin(start, end, allDay) {
        if (!allDay) {
          return { utcStartDateTime: start, utcEndDateTime: end };
        }
        const utcStart = Util.localDateToUtcDay(start);
        const utcEnd = end ? Util.localDateToUtcDay(end, 1) : undefined;
        return {
          utcStartDateTime: utcStart,
          // A last day on or before the start day is just a one-day pin.
          utcEndDateTime: utcEnd && utcStart && utcEnd > Util.localDateToUtcDay(start, 1) ? utcEnd : undefined
        };
      },

    };

    return Util;
  }

  angular.module('chronopinNodeApp.util')
    .factory('Util', UtilService);
})();
