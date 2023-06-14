(function(angular, undefined) {
'use strict';

angular.module('chronopinNodeApp.constants', [])

.constant('appConfig', {searchPrefix:{threadEmoji:'🧵',hashTag:'#'},userRoles:['guest','user','admin'],searchChoices:[{name:'All'},{name:'Watched',value:'watch'},{name:'Mine',value:'mine'}],uploadImage:{small:{width:450,postFix:''},large:{width:1000,postFix:'-chrono-lg'}},thumbFolder:'thumb',thumbUrlPrefix:'https://chronopin.blob.core.windows.net/thumb/',fbAppId:'560731380662615',gaAppId:'UA-103783559-1',scrapeType:{web:'web',twitter:'twitter',youtube:'youtube'},mediumID:{image:1,twitter:2,youtube:3},gMapKey:'AIzaSyA2Y5rx_RbJh-kHVW6H-_I-_gmkl8qB9O0',meta:{title:'Chronopin',description:'Discover and track upcoming, release dates, events, and other important dates.',image:'/assets/images/favicon.ico',type:'website'}})

;
})(angular);