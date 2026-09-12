(function(angular, undefined) {
'use strict';

angular.module('chronopinNodeApp.constants', [])

// Previous value, generated against the production blob storage:
//.constant('appConfig', {userRoles:['guest','user','admin'],searchChoices:[{name:'All'},{name:'Watched',value:'watch'}],thumbWidth:400,uploadImageWidth:1000,thumbUrlPrefix:'https://chronopin.blob.core.windows.net/thumb/',fbAppId:'560731380662615',gaAppId:'UA-103783559-1',scrapeType:{web:'web',twitter:'twitter',youtube:'youtube'},mediumID:{image:1,twitter:2,youtube:3}})

.constant('appConfig', {userRoles:['guest','user','admin'],searchChoices:[{name:'All'},{name:'Watched',value:'watch'}],thumbWidth:400,uploadImageWidth:1000,thumbUrlPrefix:'http://127.0.0.1:10000/devstoreaccount1/thumb/',fbAppId:'560731380662615',gaAppId:'UA-103783559-1',scrapeType:{web:'web',twitter:'twitter',youtube:'youtube'},mediumID:{image:1,twitter:2,youtube:3}})

;
})(angular);