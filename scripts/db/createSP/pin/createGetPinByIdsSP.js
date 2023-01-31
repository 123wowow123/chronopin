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
              [Pin].[id],
              [Pin].[title],
              [Pin].[description],
              [Pin].[sourceUrl],
              [Pin].[address],
              [Pin].[priceLowerBound],
              [Pin].[priceUpperBound],
              [Pin].[price],
              [Pin].[tip],
              [Pin].[utcStartDateTime],
              [Pin].[utcEndDateTime],
              [Pin].[allDay],
              [Pin].[userId],
              [Pin].[utcCreatedDateTime],
              [Pin].[utcUpdatedDateTime],

              COUNT([Favorites].[id])                   AS [favoriteCount],
              COUNT([Likes].[id])                       AS [likeCount],

              [Media].[id]                               AS [Media.id],
              [Media].[thumbName]                        AS [Media.thumbName],
              [Media].[thumbWidth]                       AS [Media.thumbWidth],
              [Media].[thumbHeight]                      AS [Media.thumbHeight],
              [Media].[originalUrl]                      AS [Media.originalUrl],
              [Media].[originalWidth]                    AS [Media.originalWidth],
              [Media].[originalHeight]                   AS [Media.originalHeight],
              [Media].[type]                             AS [Media.type],

              [Media].[authorName]                       AS [Media.authorName],
              [Media].[authorUrl]                        AS [Media.authorUrl],
              [Media].[html]                             AS [Media.html]

            FROM [dbo].[Pin] AS [Pin]
              JOIN @TableIds AS paramTableIds
                ON [Pin].[id] = paramTableIds.tId
              LEFT JOIN [dbo].[PinMedium] AS [Media.PinMedium]
                ON [Pin].[id] = [Media.PinMedium].[PinId]
              LEFT JOIN [dbo].[Medium] AS [Media]
                ON [Media].[id] = [Media.PinMedium].[MediumId] AND [Media.PinMedium].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[Favorite] AS [Favorites]
                ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[Like] AS [Likes]
                ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL

            WHERE [Pin].[utcDeletedDateTime] IS NULL

            GROUP BY [Pin].[utcCreatedDateTime],
              [Pin].[utcUpdatedDateTime],
              [Pin].[id],
              [Pin].[title],
              [Pin].[description],
              [Pin].[address],
              [Pin].[sourceUrl],
              [Pin].[priceLowerBound],
              [Pin].[priceUpperBound],
              [Pin].[price],
              [Pin].[tip],
              [Pin].[utcStartDateTime],
              [Pin].[utcEndDateTime],
              [Pin].[allDay],
              [Pin].[userId],
              [Media].[id],
              [Media].[thumbName],
              [Media].[thumbWidth],
              [Media].[thumbHeight],
              [Media].[originalUrl],
              [Media].[originalWidth],
              [Media].[originalHeight],
              [Media].[type],

              [Media].[authorName],
              [Media].[authorUrl],
              [Media].[html]

              ORDER BY [Pin].[utcStartDateTime];

              SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
