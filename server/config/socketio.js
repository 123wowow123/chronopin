/**
 * Socket.io configuration
 */
'use strict';

import config from './environment';
import * as log from '../util/log';

// When the user disconnects.. perform this
function onDisconnect(socket) { }

// When the user connects.. perform this
function onConnect(socket) {
  // When the client emits 'info', this listens and executes
  socket.on('info', data => {
    socket.log(log.stringify(data));
  });

  // Insert sockets below
  //require('../api/thing/thing.socket').register(socket);
  require('../api/pin/pin.socket').register(socket);

}

export default function (socketio) {
  // socket.io (v1.x.x) is powered by debug.
  // In order to see all the debug output, set DEBUG (in server/config/local.env.js) to including the desired scope.
  //
  // ex: DEBUG: "http*,socket.io:socket"

  // We can authenticate socket.io users and access their token through socket.decoded_token
  //
  // 1. You will need to send the token in `client/components/socket/socket.service.js`
  //
  // 2. Require authentication here:
  // socketio.use(require('socketio-jwt').authorize({
  //   secret: config.secrets.session,
  //   handshake: true
  // }));

  socketio.on('connection', function (socket) {
    socket.address = socket.request.connection.remoteAddress +
      ':' + socket.request.connection.remotePort;

    // console.log(`socket decoded_token ${JSON.stringify(socket.decoded_token)}`);

    // console.log(`socket handshake ${JSON.stringify(socket.handshake)}`);

    socket.connectedAt = new Date();

    socket.log = function (...data) {
      console.log(`SocketIO ${socket.nsp.name} [${socket.address}]`, ...data);
    };

    // Call onDisconnect.
    socket.on('disconnect', () => {
      onDisconnect(socket);
      socket.log('DISCONNECTED');
    });

    // Call onConnect.
    onConnect(socket);
    socket.log('CONNECTED');
  });
}
