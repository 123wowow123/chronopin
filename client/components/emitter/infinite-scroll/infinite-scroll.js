'use strict';

angular.module('chronopinNodeApp')
  .directive('infiniteScroll', function($rootScope, $log) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        const offset = parseInt(attrs.threshold) || 0;
        const el = element[0];

        $(window).on('scroll', function(event, eventData) {
          const bottom = el.scrollHeight - el.scrollTop - window.innerHeight;

          const top = $('html').scrollTop() || $('body').scrollTop(); // e.scrollTop;
          // $log.log('top, bottom', top, bottom);
          if (bottom <= offset) {
            $rootScope.$broadcast('scrolled:bottom', {
              top,
              bottom
            });
            $log.log('bottom', bottom);
          } else if (top <= offset) {
            $rootScope.$broadcast('scrolled:top', {
              top,
              bottom
            });
            $log.log('top', top);
          }
          
        });
      }

    };
  });
