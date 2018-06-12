/* global io */
'use strict';

angular.module('chronopinNodeApp')
  .factory('socket', function (socketFactory) {
    // socket.io now auto-configures its connection when we ommit a connection url
    const ioSocket = io('', {
      // Send auth token on connection, you will need to DI the Auth service above
      // 'query': 'token=' + Auth.getToken()
      path: '/socket'
    });

    const socket = ioSocket;

    // Model events to emit
    const events = [
      'favorite',
      'unfavorite',

      'like',
      'unlike',

      'save',
      'update',
      'remove'
    ];

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
        // debugger
        cb = cb || angular.noop;
        const eventPrefix = modelName + ':';

        for (const eventName of events) {
          const event = eventPrefix + eventName;
          socket.on(event, (item) => {
            cb(event, item);
          });
        }

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
