'use strict';

(function () {

  const tagOptions = {
    templateUrl: 'components/tags/chronotag.html',
    restrict: 'E',
    controllerAs: 'vm',
    bindToController: true,
    transclude: true,
    controller: function ($window, $cookies, $state, $location, $element, searchService) {
      this.goSearch = () => {
        const tagEl = _.get($element, '[0].childNodes[0]');
        searchService.goSearch(
          tagEl.outerText
        );
      }
    },
  }

  angular.module('chronopinNodeApp')
    .directive('chronohash',
      () => {
        return tagOptions;
      })
    .directive('chronoat',
      () => {
        return tagOptions;
      })
    .directive('chronodollar',
      () => {
        return tagOptions;
      });
})();