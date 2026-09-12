'use strict';

// Non-destructive: recreates the six timeline list procedures so they accept
// the optional @createdSinceDateTime cutoff behind the "added within" filter.
// Run once with `npm run migrate:add-created-filter`.
//
// Only procedure definitions are dropped and recreated - metadata, no rows -
// so this is safe against a database with real data in it, unlike
// `npm run create:db`, which rebuilds tables.
//
// The parameter defaults to NULL, so a caller that does not pass it gets the
// behaviour it had before; the client and server can be deployed in either
// order.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');

const createSP = require('../createSP');

// Prev and Next first: the Initial procedures EXEC them, and SQL Server
// resolves that reference when Initial is created.
const migrations = [
  createSP.createGetPinsWithFavoriteAndLikePrevSP,
  createSP.createGetPinsWithFavoriteAndLikeNextSP,
  createSP.createGetPinsWithFavoriteAndLikeInitialSP,
  createSP.createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP,
  createSP.createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP,
  createSP.createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP
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
      console.log('Completed addCreatedSinceFilter migration');
    });
}
