let cp;
let Request;
const StoredProcedureName = 'GetPinByIds';

// Setup
module.exports.setup = function(connectionPool) {
  cp = connectionPool;
  Request = cp.Request;
  return this;
};

module.exports.createSP = function createSP() {
  return dropCreateSP()
    .catch(function(err) {
      // ... connect error checks
      console.log("err", err);
      throw err;
    });
};

function dropCreateSP() {
  console.log(`Begin drop & create ${StoredProcedureName}`);
  return Promise.resolve('begin query')
    .then(executeDropSP)
    .then(executeDropTVP)
    .then(executeCreateTVP)
    .then(executeCreateSP)
    .then(res => {
      return `Create ${StoredProcedureName} completed`;
    });
}

function executeDropSP() {
  let sql = `
        IF OBJECTPROPERTY(object_id('[dbo].[${StoredProcedureName}]'), N'IsProcedure') = 1
          DROP PROCEDURE [dbo].[${StoredProcedureName}]
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeDropTVP() {
  let sql = `
        DROP TYPE IF EXISTS tIds;
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTVP() {
  let sql = `
        CREATE TYPE tIds AS Table (
          tId INT
        );
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateSP() {
  let sql = `
        CREATE PROCEDURE [dbo].[${StoredProcedureName}]
           @TableIds AS tIds READONLY,
           @queryCount   INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT
              [Pin].*

            FROM [dbo].[PinBaseView] AS [Pin]
              JOIN @TableIds AS paramTableIds
                ON [Pin].[id] = paramTableIds.tId

            WHERE [Pin].[utcDeletedDateTime] IS NULL

            ORDER BY [Pin].[utcStartDateTime];

            SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
