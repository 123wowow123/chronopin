'use strict';

// One-off, non-destructive schema change: adds Comment.parentCommentId to an
// existing database without the drop/recreate that `npm run create:db` does
// (which wipes data). Run once with `npm run migrate:add-comment-replies`.
//
// After ALTER TABLE, the Comment SPs that touch this column are dropped &
// recreated - that's metadata-only, not destructive to rows.

require('babel-register');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const cp = require('../../../server/sqlConnectionPool');
const Request = cp.Request;

const createSP = require('../createSP');

const createGetCommentSP = createSP.createGetCommentSP;
const createGetCommentsByPinIdSP = createSP.createGetCommentsByPinIdSP;
const createCreateCommentSP = createSP.createCreateCommentSP;

function addColumn() {
  console.log('Begin ALTER TABLE Comment ADD parentCommentId');
  const sql = `
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('[dbo].[Comment]') AND name = 'parentCommentId'
    )
    ALTER TABLE [dbo].[Comment] ADD parentCommentId INT NULL;
  `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    })
    .then(() => {
      console.log('parentCommentId column ready');
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
  createSP.setup(cp);

  return cp.getConnection()
    .then(() => {
      return [
        addColumn,
        createGetCommentSP,
        createGetCommentsByPinIdSP,
        createCreateCommentSP
      ].reduce((prev, cur) => prev.then(cur), Promise.resolve());
    })
    .then(() => {
      console.log('Completed addCommentParentCommentId migration');
    });
}
