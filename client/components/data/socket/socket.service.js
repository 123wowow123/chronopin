/* global io */
'use strict';

angular.module('chronopinNodeApp')
  .factory('socket', function(socketFactory) {
    // socket.io now auto-configures its connection when we ommit a connection url
    const ioSocket = io('', {
      // Send auth token on connection, you will need to DI the Auth service above
      // 'query': 'token=' + Auth.getToken()
      path: '/socket'
    });

    const socket = ioSocket;

    return {
      socket,

      /**
       * Register listeners to sync an array with updates on a model
       *
       * Takes the array we want to sync, the model name that socket updates are sent from,
       * and an optional callback function after new items are updated.
       *
       * @param {String} modelName
       * @param {Function} cb
       */
      syncUpdates(modelName, cb) {
        cb = cb || angular.noop;

        /**
         * Syncs item creation/updates on 'model:save'
         */
        const saveEvent = modelName + ':save';
        socket.on(saveEvent, function(item) {
          cb(saveEvent, item);
        });

        /**
         * Syncs removed items on 'model:remove'
         */
        const deleteEvent = modelName + ':remove';
        socket.on(deleteEvent, function(item) {
          cb(deleteEvent, item);
        });
      },

      /**
       * Removes listeners for a models updates on the socket
       *
       * @param modelName
       */
      unsyncUpdates(modelName) {
        socket.removeAllListeners(modelName + ':save');
        socket.removeAllListeners(modelName + ':remove');
      }
    };
  });
