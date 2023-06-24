'use strict';

(function () {

  const tagOptionsFactory = {
    templateUrl: 'components/tags/chronotag.html',
    restrict: 'E',
    controllerAs: 'vm',
    bindToController: true,
    transclude: true,
    scope: {},
    controller: ['$transclude', 'appConfig', function ($transclude, appConfig) {
      $transclude((clone, scope) => {
        let searchText = clone.text();
        this.searchText = encodeURIComponent(searchText);
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