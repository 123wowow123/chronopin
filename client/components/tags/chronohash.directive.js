'use strict';

(function () {

  const tagOFactory = {
    templateUrl: 'components/tags/chronotag.html',
    restrict: 'E',
    controllerAs: 'vm',
    bindToController: true,
    transclude: true,
    scope: {},
    controller: ['$transclude', function ($transclude) {
      $transclude((clone, scope) => {
        let searchText = clone.text();
        this.searchText = encodeURIComponent(searchText);
      });
    }],
  };

  const dollarTagFactory = {
    ...tagOFactory,
    templateUrl: 'components/tags/dollartag.html',
    controller: ['$transclude', 'stockWebService', function ($transclude, stockWebService) {
      this.loading = false;
      $transclude((clone, scope) => {
        let searchText = clone.text();
        this.searchText = encodeURIComponent(searchText);

        const symbol = searchText.substring(1);
        if (!this.lastPrice && !this.loading) {
          this.loading = true;
          let priceClassString = '';
          stockWebService.quotes(symbol)
            .then((res) => {
              this.netPercentChangeInDouble = _.get(res, 'data.netPercentChangeInDouble', '');
              if (this.netPercentChangeInDouble === 0) {
                this.priceClass = {};
              } else if (this.netPercentChangeInDouble < 0) {
                priceClassString = "--negative";
                this.priceClass = { [priceClassString]: true };
              } else {
                priceClassString = "--positive";
                this.priceClass = { [priceClassString]: true };
              }

              const lastPrice = _.get(res, 'data.lastPrice');
              const lastPriceHtml = lastPrice ? `<span class="price-tooltip ${priceClassString}">$${lastPrice}</span>` : '';
              this.lastPrice = lastPriceHtml;
            }).catch((e) => {
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