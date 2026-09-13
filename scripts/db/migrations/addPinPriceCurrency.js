'use strict';

// One-off, non-destructive schema change: adds Pin.priceCurrency to an
// existing database without the drop/recreate that `npm run create:db` does
// (which wipes data). Run once with `npm run migrate:add-pin-price-currency`.
//
// After ALTER TABLE, PinBaseView, the Create/UpdatePin procs and the six
// keyset-pagination procs are dropped & recreated - that's metadata-only, not
// destructive to rows. The pagination procs matter here because each declares
// an explicit column list, so price alone would keep reaching the timeline
// with no currency beside it.

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
const createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP;
const createGetPinsWithFavoriteAndLikeNextSP = createSP.createGetPinsWithFavoriteAndLikeNextSP;
const createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP;
const createGetPinsWithFavoriteAndLikePrevSP = createSP.createGetPinsWithFavoriteAndLikePrevSP;
const createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP = createSP.createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP;

function addColumns() {
  console.log('Begin ALTER TABLE Pin ADD priceCurrency');
  const sql = `
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[Pin]') AND name = 'priceCurrency'
    )
    ALTER TABLE [dbo].[Pin] ADD priceCurrency NVARCHAR(3) NULL;
  `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    })
    .then(() => {
      console.log('priceCurrency column ready');
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
        addColumns,
        createPinBaseView,
        createCreatePinSP,
        createUpdatePinSP,
        createGetPinsWithFavoriteAndLikePrevSP,
        createGetPinsWithFavoriteAndLikePrevFilterByHasFavoriteSP,
        createGetPinsWithFavoriteAndLikeNextSP,
        createGetPinsWithFavoriteAndLikeNextFilterByHasFavoriteSP,
        createGetPinsWithFavoriteAndLikeInitialSP,
        createGetPinsWithFavoriteAndLikeInitialFilterByHasFavoriteSP
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed addPinPriceCurrency migration');
    });
}
