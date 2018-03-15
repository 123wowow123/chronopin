/*jshint unused:false*/
'use strict';

(function() {

  function _appendTransform(defaults, transform) {
    // We can't guarantee that the default transformation is an array
    defaults = angular.isArray(defaults) ? defaults : [defaults];
    // Append the new transformation to the defaults
    return defaults.concat(transform);
  }

  angular.module('chronopinNodeApp')
    .service('dateTimeService', function($q, $http, linkHeaderParser) {

      this.list = function(data) {
        return $http({
          url: '/api/dates/',
          method: 'GET',
          params: data,
          transformResponse: _appendTransform($http.defaults.transformResponse,
            function(data, headersGetter, status) {
              let linkHeader,
                header = headersGetter();
              if (header.link) {
                linkHeader = linkHeaderParser.parse(header.link);
                data.linkHeader = linkHeader;
              }
              return data;
            })
        });
      };
      
    });

})();
