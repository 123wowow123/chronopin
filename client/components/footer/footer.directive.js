'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .directive('footer', function () {
      return {
        templateUrl: 'components/footer/footer.html',
        restrict: 'E',
        link: function (scope, element) {
          element.addClass('footer');
        }
      };
    });
})();