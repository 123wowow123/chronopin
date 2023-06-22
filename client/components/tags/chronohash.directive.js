'use strict';

(function () {

  const tagOptionsFactory = {
    templateUrl: 'components/tags/chronotag.html',
    restrict: 'E',
    controllerAs: 'vm',
    bindToController: true,
    transclude: true,
    scope: {},
    controller: ['$transclude', function ($transclude) {
      $transclude((clone, scope) => {
        this.searchText = clone.text();
      });
    }],
  };

  angular.module('chronopinNodeApp')
    .directive('chronohash',
      () => {
        return tagOptionsFactory;
      })
    .directive('chronoat',
      () => {
        return tagOptionsFactory;
      })
    .directive('chronodollar',
      () => {
        return tagOptionsFactory;
      });
})();