/*jshint unused:false*/
'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .service('stockWebService', function ($q, $http) {

      this.quotes = function (symbol) {
        return $http({
          url: '/api/stock/quotes',
          method: 'GET',
          params: {
            symbol: symbol
          },
          ignoreLoadingBar: true
        });
      };

    });

})();
