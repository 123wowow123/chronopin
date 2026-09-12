'use strict';

// One-off, non-destructive schema change: adds Pin.longFormSummary to an
// existing database without the drop/recreate that `npm run create:db`
// does (which wipes data). Run once with `npm run migrate:add-pin-summary`.
//
// After ALTER TABLE, PinBaseView and the Create/UpdatePin procs are
// dropped & recreated - that's metadata-only, not destructive to rows.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');
const Request = cp.Request;

const createTable = require('../createTable');
const createSP = require('../createSP');

const createPinBaseView = createTable.createPinBaseView;
const createCreatePinSP = createSP.createCreatePinSP;
const createUpdatePinSP = createSP.createUpdatePinSP;

function addColumn() {
  console.log('Begin ALTER TABLE Pin ADD longFormSummary');
  const sql = `
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[Pin]') AND name = 'longFormSummary'
    )
    ALTER TABLE [dbo].[Pin] ADD longFormSummary NVARCHAR(MAX) NULL;
  `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    })
    .then(() => {
      console.log('longFormSummary column ready');
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
        createUpdatePinSP
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed addPinLongFormSummary migration');
    });
}
