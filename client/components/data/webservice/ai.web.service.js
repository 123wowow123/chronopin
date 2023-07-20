/*jshint unused:false*/
'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .service('aiWebService', function ($q, $http) {

      this.sentiment = function (pin) {
        return $http({
          url: '/api/ai/sentiment',
          method: 'POST',
          data: pin,
          ignoreLoadingBar: true
        });
      };

    });

})();
