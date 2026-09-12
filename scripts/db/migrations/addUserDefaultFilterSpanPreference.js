'use strict';

// One-off, non-destructive schema change: adds
// User.defaultFilterSpanPreference, the span each person wants the timeline's
// "posted within" combo to start on.
// Run once with `npm run migrate:add-filter-span-preference`.
//
// Adds the column without the drop/recreate that `npm run create:db` does
// (which wipes every user row). UpdateUser and GetUserById are then dropped &
// recreated so they carry the new column - metadata only, no rows touched.
//
// The column is nullable and the procedure parameter defaults to NULL, so a
// person who has never opened the settings page reads back as "no preference"
// and the combo falls back to the span it was hardcoded to before.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');
const Request = cp.Request;

const createSP = require('../createSP');

const createUpdateUserSP = createSP.createUpdateUserSP;
const createGetUserByIdSP = createSP.createGetUserByIdSP;

function addColumn() {
  console.log('Begin ALTER TABLE User ADD defaultFilterSpanPreference');
  const sql = `
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[User]') AND name = 'defaultFilterSpanPreference'
    )
    ALTER TABLE [dbo].[User] ADD defaultFilterSpanPreference NVARCHAR(20) NULL;
  `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    })
    .then(() => {
      console.log('defaultFilterSpanPreference column ready');
    });
}

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
      return [
        addColumn,
        createUpdateUserSP,
        createGetUserByIdSP
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed addUserDefaultFilterSpanPreference migration');
    });
}
