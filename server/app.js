/**
 * Main application file
 */

'use strict';

import express from 'express';
//import sqldb from './sqldb';
import config from './config/environment';
import http from 'http';


// Setup server
const app = express();
const server = http.createServer(app);
const socketio = require('socket.io')(server, {
  //serveClient: config.env !== 'production',
  path: '/socket'
});
require('./config/socketio').default(socketio);
require('./config/sns').default(require('./sns'));
require('./config/search').default(require('./api/pin/pin.search.controller'));
require('./config/express').default(app);
require('./routes').default(app);

// Start Server Call
startServer();

// Start server
function startServer() {
  app.angularFullstack = server.listen(config.port, config.ip, function() {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
  });
}

// Expose app
exports = module.exports = app; 
