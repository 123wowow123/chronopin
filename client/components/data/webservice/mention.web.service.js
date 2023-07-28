/*jshint unused:false*/
'use strict';

(function () {

  angular.module('chronopinNodeApp')
    .service('mentionService', function ($q, $http) {

      this.autocomplete = function (tagString) {
        return $http({
          url: '/api/mention/autocomplete',
          method: 'GET',
          params: {
            q: tagString
          },
          ignoreLoadingBar: true
        });
      };

    });

})();
