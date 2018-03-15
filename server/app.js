/**
 * Main application file
 */

'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _environment = require('./config/environment');

var _environment2 = _interopRequireDefault(_environment);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Populate databases with sample data


// Setup server

//import sqldb from './sqldb';
var app = (0, _express2.default)();
var server = _http2.default.createServer(app);
var socketio = require('socket.io')(server, {
  //serveClient: config.env !== 'production',
  path: '/socket.io-client'
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
  app.angularFullstack = server.listen(_environment2.default.port, _environment2.default.ip, function () {
    console.log('Express server listening on %d, in %s mode', _environment2.default.port, app.get('env'));
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
//# sourceMappingURL=app.js.map
