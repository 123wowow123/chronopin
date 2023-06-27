'use strict';

(function () {

  const tagOFactory = {
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

  const dollarTagFactory = {
    ...tagOFactory,
    templateUrl: 'components/tags/dollartag.html',
    controller: ['$transclude', '$sce', 'stockWebService', function ($transclude, $sce, stockWebService) {
      this.loading = false;
      $transclude((clone, scope) => {
        let searchText = clone.text();
        this.searchText = encodeURIComponent(searchText);

        const symbol = searchText.substring(1);
        if (!this.lastPrice && !this.loading) {
          this.loading = true;
          stockWebService.quotes(symbol)
            .then((res) => {
              this.lastPrice = _.get(res, 'data.lastPrice', '');
              this.netPercentChangeInDouble = _.get(res, 'data.netPercentChangeInDouble', '');
            })
            .catch((e) => {
              return e;
            }).finally(() => {
              this.loading = false;
            });
        }
      });
    }],
  };

  angular.module('chronopinNodeApp')
    .directive('chronohash',
      () => {
        return tagOFactory;
      })
    .directive('chronoat',
      () => {
        return tagOFactory;
      })
    .directive('chronodollar',
      () => {
        return dollarTagFactory;
      });
})();