let cp;
let Request;
const StoredProcedureName = 'GetPinByAuthersFilterByHasFavorite';

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
        DROP TYPE IF EXISTS tAuthors2;
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTVP() {
  let sql = `
        CREATE TYPE tAuthors2 AS Table (
          userName NVARCHAR(255)
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
           @TableAuthors AS tAuthors2 READONLY,
           @userId       INT,
           @queryCount   INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT
              [Pin].*

            FROM [dbo].[PinBaseView] AS [Pin]
              JOIN @TableAuthors AS paramTable
                ON [Pin].[User.userName] = paramTable.userName
              LEFT JOIN [dbo].[Favorite] AS [Favorites]
                ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL

            WHERE [Pin].[utcDeletedDateTime] IS NULL
              AND [Favorites].[userId] = @userId

              ORDER BY [Pin].[utcStartDateTime], [Pin].[id];

              SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
