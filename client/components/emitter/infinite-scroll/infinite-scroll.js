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

          // start browser incompatibility hack
          // https://stackoverflow.com/questions/1830080/jquery-scrolltop-doesnt-seem-to-work-in-safari-or-chrome-windows
          // $.browser.safari ? $("body") : $("html") ;
          const top = $('html').scrollTop() || $('body').scrollTop(); // e.scrollTop;
          // end browser incompatibility hack

          if (bottom <= offset) {
            $rootScope.$broadcast('scrolled:bottom', {
              top: top,
              bottom: bottom
            });
            $log.log('bottom', bottom);
          } else if (top <= offset) {
            $rootScope.$broadcast('scrolled:top', {
              top: top,
              bottom: bottom
            });
            $log.log('top', top);
          }
          
        });
      }

    };
  });
