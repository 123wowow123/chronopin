'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .filter('percentage', function ($filter) {

      return function (input, decimals) {
        return $filter('number')(input, decimals) + '%';
      };

    });

})();
