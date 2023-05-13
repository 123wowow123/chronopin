'use strict';

angular.module('chronopinNodeApp')
  .directive('oauthButtons', function() {
    return {
      templateUrl: 'components/oauth-buttons/oauth-buttons.html',
      restrict: 'EA',
      controller: 'OauthButtonsCtrl',
      controllerAs: 'OauthButtons',
      scope: {
        classes: '@',
        provider: '@',
        label: '@',
        handle: '@',
        validateFn: '&'
      }
    };
  });
