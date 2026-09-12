'use strict';

// One-off, non-destructive schema change: lets Pin.utcEndDateTime be NULL on
// an existing database without the drop/recreate that `npm run create:db`
// does (which wipes data). Run once with `npm run migrate:nullable-pin-end`.
//
// A pin often has no end - the create form leaves it empty, and CreatePin
// then failed outright on "Cannot insert the value NULL into column
// 'utcEndDateTime'". DateTime.utcEndDateTime was already nullable; this
// brings Pin in line with it.
//
// PinBaseView has to go first: it is WITH SCHEMABINDING and selects this
// column, so SQL Server refuses the ALTER while it exists. Dropping and
// recreating a view is metadata-only, not destructive to rows.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');
const Request = cp.Request;

const createTable = require('../createTable');

const createPinBaseView = createTable.createPinBaseView;

function dropSchemaboundView() {
  console.log('Begin DROP VIEW PinBaseView (blocks ALTER COLUMN while bound)');
  const sql = `DROP VIEW IF EXISTS [dbo].[PinBaseView];`;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function alterColumn() {
  console.log('Begin ALTER TABLE Pin ALTER COLUMN utcEndDateTime NULL');
  // DATETIME2(0) is repeated from createTable/Pin.js on purpose - ALTER
  // COLUMN restates the full type, and omitting the precision would quietly
  // widen it to the DATETIME2 default of 7.
  const sql = `
    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[Pin]')
        AND name = 'utcEndDateTime'
        AND is_nullable = 0
    )
    ALTER TABLE [dbo].[Pin] ALTER COLUMN utcEndDateTime DATETIME2(0) NULL;
  `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    })
    .then(() => {
      console.log('utcEndDateTime is nullable');
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

  return cp.getConnection()
    .then(() => {
      return [
        dropSchemaboundView,
        alterColumn,
        createPinBaseView
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed allowNullPinEndDateTime migration');
    });
}
