'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var config = require('../config/environment');
var mssql = require('mssql');
var Request = mssql.Request;
var cp = null;

// https://gist.github.com/tracker1/5ad0bff295369ac05eea
module.exports.getConnection = function getConnection() {
  if (cp) return cp;
  return cp = new _promise2.default(function (resolve, reject) {
    // jshint ignore:line
    var conn = new mssql.Connection(config.sequelize.uri, function (err) {
      if (err) {
        cp = null;
        console.log('Connection err on database: ' + conn.config.database + ', connected: ' + conn.connected);
        return reject(err);
      } else {
        console.log('Connection created on database: ' + conn.config.database + ', connected: ' + conn.connected);
        return resolve(conn);
      }
    });
  });
};

module.exports.closeConnection = function closeConnection() {
  if (cp) return cp.close();
};

module.exports.Request = Request;
//# sourceMappingURL=index.js.map
