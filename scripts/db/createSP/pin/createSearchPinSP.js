let cp;
let Request;
const StoredProcedureName = 'SearchPin';

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

function executeCreateSP() {
  let sql = `
        CREATE PROCEDURE [dbo].[${StoredProcedureName}]
          @searchTitle         NVARCHAR(64),
          @searchDescription   NVARCHAR(64),
          @top                 INT,
          @queryCount          INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT @searchTitle = RTRIM(@searchTitle) + '%';  
        SELECT @searchDescription = RTRIM(@searchDescription) + '%';  

        SELECT TOP (@top)
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
            [Media].[type]                             AS [Media.type]

          FROM [dbo].[Pin] AS [Pin]
            LEFT JOIN [dbo].[PinMedium] AS [Media.PinMedium]
              ON [Pin].[id] = [Media.PinMedium].[PinId]
            LEFT JOIN [dbo].[Medium] AS [Media]
              ON [Media].[id] = [Media.PinMedium].[MediumId] AND [Media.PinMedium].[utcDeletedDateTime] IS NULL
            LEFT JOIN [dbo].[Favorite] AS [Favorites]
              ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
            LEFT JOIN [dbo].[Like] AS [Likes]
              ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL

          WHERE [Pin].[utcDeletedDateTime] IS NULL 
            AND [Pin].[title] LIKE @searchTitle
            OR  [Pin].[description] LIKE @searchDescription

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
            [Media].[type]
            ORDER BY [Pin].[utcStartDateTime];

            SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
