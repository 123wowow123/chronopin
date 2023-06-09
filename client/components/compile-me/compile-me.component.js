'use strict';

(function () {

  class Controller {

    constructor($scope, $element, $compile) {
      this.$scope = $scope;
      this.$element = $element;
      this.$compile = $compile;
    }

    $onInit() {
      let $el = angular.element(this.html);
      let link = this.$compile($el);
      let $newScope = this.$scope.$parent.$new();
      link($newScope);
      this.$element.parent().append($el);
      this.$scope.$destroy();
      this.$element.remove();
    }

  }

  angular
    .module('chronopinNodeApp')
    .directive('compileMe', function () {
      return {
        restrict: 'E',
        controllerAs: 'vm',
        bindToController: true,
        scope: {
          html: "="
        },
        controller: Controller
      };
    });

})();