'use strict';

(function () {

  function modelInjector($injector) {
    let injector = {
      getUser: function () {
        return $injector.get('UserFactory');
      },
      getMedium: function () {
        return $injector.get('MediumFactory');
      },
      getLocation: function () {
        return $injector.get('LocationFactory');
      },
      getPin: function () {
        return $injector.get('PinFactory');
      },
      getDateTime: function () {
        return $injector.get('DateTimeFactory');
      },
      getBag: function () {
        return $injector.get('BagFactory');
      },
      getBags: function () {
        return $injector.get('BagsFactory');
      },
      getPinsQuery: function () {
        return $injector.get('PinsQueryFactory');
      },
      getPinApp: function() {
        return $injector.get('PinAppFactory');
      }
    };
    return injector;
  }

  angular.module('chronopinNodeApp.model')
    .factory('modelInjector', modelInjector);

  angular.module('chronopinNodeApp.model')
    .factory('pinApp', function(modelInjector){
      let pinApp = modelInjector.getPinApp();
      return new pinApp();
    });

})();
