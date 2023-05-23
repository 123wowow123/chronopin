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

      getGoogleMapUrl(pin) {
        function googleMapEncode(location) {
          return location.address.replace(' ', '+')
        }
        function joinLocations(locations) {
          return locations.reduce((a, t) => {
            return a ? `${a}|` : '' + googleMapEncode(t);
          }, '');
        }

        const key = '?key=' + appConfig.gMapKey;
        let origin;
        let destination;
        let waypoints;
        let cloneLocations = _.get(pin, 'locations', []).slice(0);
        let locationLength = cloneLocations.length;

        if (locationLength === 0) {
          return '';
        } else if (locationLength === 1) {
          origin = googleMapEncode(cloneLocations.shift());
        } else if (locationLength === 2) {
          origin = googleMapEncode(cloneLocations.shift());
          destination = googleMapEncode(cloneLocations.pop());
        } else if (locationLength > 2) {
          origin = googleMapEncode(cloneLocations.shift());
          destination = googleMapEncode(cloneLocations.pop());
          waypoints = joinLocations(cloneLocations);
        }

        if (locationLength === 1) {
          return `https://www.google.com/maps/embed/v1/place` +
            key +
            `&q=${origin}`;
        } else {
          return `https://www.google.com/maps/embed/v1/directions` +
            key +
            `&origin=${origin}` +
            `${destination ? '&destination=' + destination : ''}` +
            `${waypoints ? '&waypoints=' + waypoints : ''}`;
        }
      },

      hasAddress(pin) {
        return _.get(pin, "locations[0].address");
      }

    };

    return Util;
  }

  angular.module('chronopinNodeApp.util')
    .factory('Util', UtilService);
})();
