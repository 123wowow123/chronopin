'use strict';

angular.module('chronopinNodeApp.google', [
    'chronopinNodeApp.constants',
    'chronopinNodeApp.auth'
  ])
  .run((GA) => {
    // inits GA by forcibly injecting into run
  });
