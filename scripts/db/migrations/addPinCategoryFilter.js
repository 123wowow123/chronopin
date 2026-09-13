'use strict';

// Non-destructive: creates the two procedures behind clicking a pin's
// category to filter by it (a `category:<name>` search).
// Run once with `npm run migrate:add-category-filter`.
//
// Only procedure definitions are dropped and recreated - metadata, no rows -
// so this is safe against a database with real data in it, unlike
// `npm run create:db`, which rebuilds tables.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');

const createSP = require('../createSP');

const migrations = [
  createSP.createGetPinByCategorySP,
  createSP.createGetPinByCategoryFilterByHasFavoriteSP
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
      console.log('Completed addPinCategoryFilter migration');
    });
}
