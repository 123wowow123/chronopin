/**
 * Main application file
 */

'use strict';

import express from 'express';
//import sqldb from './sqldb';
import config from './config/environment';
import http from 'http';

// Populate databases with sample data



// Setup server
var app = express();
var server = http.createServer(app);
var socketio = require('socket.io')(server, {
  //serveClient: config.env !== 'production',
  path: '/socket'
});
require('./config/socketio').default(socketio);
require('./config/sns').default(require('./sns'));
require('./config/express').default(app);
require('./routes').default(app);

// if (config.seedDB) {
//   var seed = require('./config/seed').default;
//   seed()
//     .then(() => {
//       initServerDB();
//     });
// } else {
//   initServerDB();
// }

// Start Server Call
startServer();

// Start server
function startServer() {
  app.angularFullstack = server.listen(config.port, config.ip, function() {
    console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
  });
}

// function initServerDB() {
//   sqldb.sequelize.sync()
//     .then(startServer)
//     .catch(function(err) {
//       console.log('Server failed to start due to error: %s', err);
//     });
// }

// Expose app
exports = module.exports = app;
