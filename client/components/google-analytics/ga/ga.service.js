'use strict';

(function() {
  /* Google Analytics: change UA-XXXXX-X to be your site's ID */
  /* autotrack is installed though bower: https://github.com/googleanalytics/autotrack#installation-and-usage */
  (function(i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r;
    i[r] = i[r] || function() {
      (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date();
    a = s.createElement(o),
      m = s.getElementsByTagName(o)[0];
    a.async = 1;
    a.src = g;
    m.parentNode.insertBefore(a, m)
  })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');


  class GoogleAnalytics {
    constructor(appConfig, Auth) {
      let self = this;
      this.Auth = Auth;
      ga('create', appConfig.gaAppId);
      ga('require', 'displayfeatures');
      ga('require', 'socialWidgetTracker');
      ga('require', 'urlChangeTracker', {
        fieldsObj: {
          dimension1: 'virtual'
        },
        hitFilter: function(model) {
          model.set('userId', String(self.Auth.getCurrentUser().id, true));
        }
      });
      ga('send', 'pageview', {
        dimension1: 'page load'
      });
    }

    get() {
      return ga;
    }
  }

  angular.module('chronopinNodeApp.google')
    .service('GA', GoogleAnalytics);
})();
