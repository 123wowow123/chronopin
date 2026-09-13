'use strict';

// Non-destructive: creates the procedure behind searches built from a pin
// card's labels (user:, company: and category: terms, in any combination).
// Run once with `npm run migrate:add-search-filters`.
//
// Only a procedure and its table type are dropped and recreated - metadata,
// no rows - so this is safe against a database with real data in it, unlike
// `npm run create:db`, which rebuilds tables.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');

const createSP = require('../createSP');

const migrations = [
  createSP.createGetPinBySearchFiltersSP
];

execute()
  .catch(err => {
    console.log('migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    cp.closeConnection();
  });

function execute() {
  createSP.setup(cp);

  return cp.getConnection()
    .then(() => {
      return migrations.reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed addPinSearchFilters migration');
    });
}
