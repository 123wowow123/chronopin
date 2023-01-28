'use strict';

const config = require('../config/environment');
const mssql = require('mssql');
const Request = mssql.Request;
var cp = null;
let conn = null;

// https://gist.github.com/tracker1/5ad0bff295369ac05eea
module.exports.getConnection = function getConnection() {
  if (cp) return cp;
  return cp = new Promise(function (resolve, reject) { // jshint ignore:line
    conn = new mssql.connect(config.sequelize.uri, function (err) {
      if (err) {
        cp = null;
        console.log(`Connection err on database: ${conn.config.database}, connected: ${conn.connected}`);
        return reject(err);
      } else {
        console.log(`Connection created on database: ${conn.config.database}, connected: ${conn.connected}`);
        return resolve(conn);
      }
    });
  });
};

module.exports.closeConnection = function closeConnection() {
  if (conn) {
    console.log("DB connection closed")
    return conn.close();
  }
};

module.exports.Request = Request;
