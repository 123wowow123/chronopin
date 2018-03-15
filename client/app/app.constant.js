(function(angular, undefined) {
'use strict';

angular.module('chronopinNodeApp.constants', [])

.constant('appConfig', {userRoles:['guest','user','admin'],thumbWidth:400,thumbUrlPrefix:'https://chronopin.blob.core.windows.net/thumb/',fbAppId:'560731380662615',gaAppId:'UA-103783559-1'})

;
})(angular);