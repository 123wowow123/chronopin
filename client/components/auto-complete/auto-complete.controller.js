angular.module('chronopinNodeApp')
  .controller('AutoCompleteController', function ($scope, $timeout) {

    // -1 means no selection
    $scope.current = -1;

    $scope.handleSelection = (selectedItem) => {
      //console.log(JSON.stringify(selectedItem));
      $scope.onSelect({ $event: { data: selectedItem } });
      $scope.current = -1;
    };

    $scope.isCurrent = (index) => {
      return $scope.current == index;
    };
    $scope.setCurrent = (index) => {
      $scope.current = index;
    };

    $scope.mouseleave = () => {
      $scope.current = -1;
    };

  });