let cp;
let Request;
const StoredProcedureName = 'GetPinBySearchFilters';

// Backs a search made only of the terms a pin card's labels add - user:,
// company: and category:. Each table holds one field's values: several values
// in a table widen the search, an empty table leaves that field unfiltered,
// and the fields narrow each other.

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
  // The procedure goes first: a table type cannot be dropped while a
  // procedure still takes it as a parameter.
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
        DROP TYPE IF EXISTS tSearchFilterValues;
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTVP() {
  let sql = `
        CREATE TYPE tSearchFilterValues AS Table (
          value NVARCHAR(255)
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
           @TableUserNames  AS tSearchFilterValues READONLY,
           @TableCompanies  AS tSearchFilterValues READONLY,
           @TableCategories AS tSearchFilterValues READONLY,
           @favoriteUserId  INT = NULL,
           @queryCount      INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT
              [Pin].*

            FROM [dbo].[PinBaseView] AS [Pin]

            WHERE [Pin].[utcDeletedDateTime] IS NULL
              AND (NOT EXISTS (SELECT 1 FROM @TableUserNames)
                OR [Pin].[User.userName] IN (SELECT [value] FROM @TableUserNames))
              AND (NOT EXISTS (SELECT 1 FROM @TableCompanies)
                OR [Pin].[company] IN (SELECT [value] FROM @TableCompanies))
              AND (NOT EXISTS (SELECT 1 FROM @TableCategories)
                OR [Pin].[category] IN (SELECT [value] FROM @TableCategories))
              -- The Watch search choice: only pins this user watches.
              AND (@favoriteUserId IS NULL OR EXISTS (
                SELECT 1
                FROM [dbo].[Favorite] AS [Favorites]
                WHERE [Favorites].[PinId] = [Pin].[id]
                  AND [Favorites].[utcDeletedDateTime] IS NULL
                  AND [Favorites].[userId] = @favoriteUserId))

            ORDER BY [Pin].[utcStartDateTime], [Pin].[id];

            SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
