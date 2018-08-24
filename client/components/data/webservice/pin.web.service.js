 /*jshint unused:false*/
 'use strict';

 (function() {

   function _appendTransform(defaults, transform) {
     // We can't guarantee that the default transformation is an array
     defaults = angular.isArray(defaults) ? defaults : [defaults];
     // Append the new transformation to the defaults
     return defaults.concat(transform);
   }

   angular.module('chronopinNodeApp')
     .service('pinWebService', function($q, $http, linkHeaderParser) {

       this.get = function(id, data) {
         return $http({
           url: '/api/pins/' + id,
           method: 'GET',
           params: data
         });
       };

       this.list = function(data) {
         return $http({
           url: '/api/pins',
           method: 'GET',
           params: data,
           transformResponse: _appendTransform($http.defaults.transformResponse,
             function(data, headersGetter, status) {
               let linkHeader,
                 header = headersGetter();
               if (header.link) {
                 linkHeader = linkHeaderParser.parse(header.link);
                 data.linkHeader = linkHeader;
               }
               return data;
             })
         });
       };

       this.search = function(data) {
         return $http({
           url: '/api/pins/search',
           method: 'GET',
           params: {
             q: data.q,
             f: data.f
           },
           transformResponse: _appendTransform($http.defaults.transformResponse,
             function(data, headersGetter, status) {
               let linkHeader,
                 header = headersGetter();
               if (header.link) {
                 linkHeader = linkHeaderParser.parse(header.link);
                 data.linkHeader = linkHeader;
               }
               return data;
             })
         });
       };

       this.autocomplete = function(data) {
        return $http({
          url: '/api/pins/autocomplete',
          method: 'GET',
          params: {
            q: data.q,
            f: data.f
          },
          transformResponse: _appendTransform($http.defaults.transformResponse,
            function(data, headersGetter, status) {
              let linkHeader,
                header = headersGetter();
              if (header.link) {
                linkHeader = linkHeaderParser.parse(header.link);
                data.linkHeader = linkHeader;
              }
              return data;
            })
        });
      };

       this.like = function(id, data) {
         return $http.post('/api/pins/' + id + '/like', data);
       };

       this.unlike = function(id, data) {
         return $http.delete('/api/pins/' + id + '/like', data);
       };

       this.favorite = function(id, data) {
         return $http.post('/api/pins/' + id + '/favorite', data);
       };

       this.unfavorite = function(id, data) {
         return $http.delete('/api/pins/' + id + '/favorite', data);
       };

     });

 })();
