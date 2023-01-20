'use strict';

// Suppresses "Error: self signed certificate in certificate chain"
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

// Set default node environment to development
var env = process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// console.log('process', process);
console.log('process.env.NODE_ENV', env);

if (env === 'development' || env === 'test') {
  // Register the Babel require hook
  require('babel-register');
}

// Export the application
exports = module.exports = require('./app');
