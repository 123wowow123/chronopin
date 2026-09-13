'use strict';

// One-off, non-destructive schema change: adds Pin.company and Pin.category
// to an existing database without the drop/recreate that `npm run create:db`
// does (which wipes data). Run once with `npm run migrate:add-pin-company-category`.
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

function addColumns() {
  console.log('Begin ALTER TABLE Pin ADD company, category');
  const sql = `
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[Pin]') AND name = 'company'
    )
    ALTER TABLE [dbo].[Pin] ADD company NVARCHAR(255) NULL;

    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[Pin]') AND name = 'category'
    )
    ALTER TABLE [dbo].[Pin] ADD category NVARCHAR(64) NULL;
  `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    })
    .then(() => {
      console.log('company/category columns ready');
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
        createUpdatePinSP
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed addPinCompanyCategory migration');
    });
}
