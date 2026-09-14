'use strict';

angular.module('chronopinNodeApp')
  .config(function($stateProvider) {
    $stateProvider.state('search', {
      url: '/search?q&f&s',
      // s=relevance ranks the results instead of laying them out on the
      // timeline. Dynamic, so flipping it rewrites the URL without reloading
      // the component and re-running the search.
      params: {
        s: { value: null, squash: true, dynamic: true }
      },
      template: '<search></search>'
    });
  });
