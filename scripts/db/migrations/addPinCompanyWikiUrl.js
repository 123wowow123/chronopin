'use strict';

// One-off, non-destructive schema change: adds Pin.companyWikiUrl to an
// existing database without the drop/recreate that `npm run create:db`
// does (which wipes data). Run once with `npm run migrate:add-pin-company-wiki-url`.
//
// After ALTER TABLE, PinBaseView, the Create/UpdatePin procs, and the
// GetPinsWithFavoriteAndLike* paged-read procs (whose @tempPinsTbl column
// list has to match) are dropped & recreated - that's metadata-only, not
// destructive to rows.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');
const Request = cp.Request;

const createTable = require('../createTable');
const createSP = require('../createSP');

const createPinBaseView = createTable.createPinBaseView;
const createCreatePinSP = createSP.createCreatePinSP;
const createUpdatePinSP = createSP.createUpdatePinSP;
const createGetPinsWithFavoriteAndLikeInitialSP = createSP.createGetPinsWithFavoriteAndLikeInitialSP;
const createGetPinsWithFavoriteAndLikeNextSP = createSP.createGetPinsWithFavoriteAndLikeNextSP;
const createGetPinsWithFavoriteAndLikePrevSP = createSP.createGetPinsWithFavoriteAndLikePrevSP;
const createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP;
const createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP;
const createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP;

function addColumn() {
  console.log('Begin ALTER TABLE Pin ADD companyWikiUrl');
  const sql = `
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[Pin]') AND name = 'companyWikiUrl'
    )
    ALTER TABLE [dbo].[Pin] ADD companyWikiUrl NVARCHAR(2048) NULL;
  `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    })
    .then(() => {
      console.log('companyWikiUrl column ready');
    });
}

execute()
  .catch(err => {
    console.log('migration failed:', err);
  })
  .finally(() => {
    cp.closeConnection();
  });

function execute() {
  createTable.setup(cp);
  createSP.setup(cp);

  return cp.getConnection()
    .then(() => {
      return [
        addColumn,
        createPinBaseView,
        createCreatePinSP,
        createUpdatePinSP,
        createGetPinsWithFavoriteAndLikeNextSP,
        createGetPinsWithFavoriteAndLikePrevSP,
        createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP,
        createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP,
        createGetPinsWithFavoriteAndLikeInitialSP,
        createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed addPinCompanyWikiUrl migration');
    });
}
