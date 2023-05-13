'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .directive('navbar', () => ({
      templateUrl: 'components/navbar/navbar.html',
      restrict: 'E',
      controller: 'NavbarController',
      controllerAs: 'nav',
      link: function (scope, elem, attrs) {

        function collapseNavMenu(e) {
          e.stopPropagation();
          scope.$apply(() => {
            //scope.onDismiss({ $event: e });
            scope.nav.isCollapsed = true;
          });
        }

        // Dismiss Event handler
        function dismissDropdown(e) {

          const navbarToggle = document.getElementById("navbar-toggle");
          const subDropdownToggle = document.getElementsByClassName("sub-dropdown-activation");

          if (!navbarToggle) return collapseNavMenu(e);
          if (subDropdownToggle && subDropdownToggle[0] && subDropdownToggle[0].contains(e.target)) return;

          const foundEl = navbarToggle.contains(e.target);

          if (foundEl || scope.nav.isCollapsed) return;

          collapseNavMenu(e);
        };

        // Dismiss Dropdown
        document.addEventListener(
          "click",
          dismissDropdown
        );

        // Cleanup
        scope.$on('$destroy', () => {
          document.addEventListener(
            "click",
            dismissDropdown
          );

        });

      },
    }));
})();