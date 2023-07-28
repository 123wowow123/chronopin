angular.module('chronopinNodeApp')
  .directive('autoComplete', function () {
    return {
      restrict: 'E',
      scope: {
        suggestions: '<',
        show: '<',
        title: '@',
        onSelect: '&',
        onDismiss: '&',
        top: '<'
      },
      link: function (scope, elem, attrs) {

        // Dismiss Event handler
        function dismissDropdown(e) {
          e.stopPropagation();
          scope.$apply(() => {
            scope.onDismiss({ $event: e });
          });
        };

        function arrowNavigationAndSelect(e) {
          e.stopPropagation();
          if (!_.get(scope, 'suggestions.length', 0)) {
            return;
          }
          scope.$apply(() => {
            if (e.which === 40) {
              // down key
              const newIndex = scope.current == scope.suggestions.length - 1
                ? 0
                : scope.current + 1;
              scope.setCurrent(newIndex);
            } else if (e.which === 38) {
              // up key
              const newIndex = (scope.current <= 0)
                ? scope.suggestions.length - 1
                : scope.current - 1;
              scope.setCurrent(newIndex);
            } else if (e.which === 27) {
              // esc key
              scope.onDismiss({ $event: e });
            } else if (e.which === 13 && scope.current != -1) {
              // enter key
              scope.handleSelection(
                scope.suggestions[scope.current]
              );
            }
          });
        };

        // Dismiss Dropdown
        document.addEventListener(
          "click",
          dismissDropdown
        );

        // Arrow Navigation
        document.addEventListener(
          "keydown",
          arrowNavigationAndSelect
        );

        // Cleanup
        scope.$on('$destroy', () => {
          document.addEventListener(
            "click",
            dismissDropdown
          );

          document.addEventListener(
            "click",
            arrowNavigationAndSelect
          );
        });

        // Watch property change
        scope.$watch('show', () => {
          elem[0].style.display = scope.show ? '' : 'none';
        });

      },
      controller: 'AutoCompleteController',
      templateUrl: 'components/auto-complete/auto-complete.html'
    };
  });