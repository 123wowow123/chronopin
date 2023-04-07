let cp;
let Request;
const StoredProcedureName = 'GetPinWithFavoriteAndLike';

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
           @pinId INT,
           @userId INT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT TOP 1
              [Pin].[id],
              [Pin].[parentId],
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

              (CAST((SELECT COUNT(f.id) FROM [Favorite] AS f WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS bit)) AS [hasFavorite],
              (CAST((SELECT COUNT(l.id) FROM [Like] AS l WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS bit)) AS [hasLike],

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
              [Media].[html]                             AS [Media.html],

              [User].[userName]                                                           AS [User.userName]

            FROM [dbo].[Pin] AS [Pin]
              LEFT JOIN [dbo].[PinMedium] AS [Media.PinMedium]
                ON [Pin].[id] = [Media.PinMedium].[PinId]
              LEFT JOIN [dbo].[Medium] AS [Media]
                ON [Media].[id] = [Media.PinMedium].[MediumId] AND [Media.PinMedium].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[Favorite] AS [Favorites]
                ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[Like] AS [Likes] ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL
              LEFT JOIN [dbo].[User] AS [User]
                ON [Pin].[userId] = [User].[id]

            WHERE [Pin].[id] = @pinId AND [Pin].[utcDeletedDateTime] IS NULL

            GROUP BY [Pin].[utcCreatedDateTime],
              [Pin].[utcUpdatedDateTime],
              [Pin].[id],
              [Pin].[parentId],
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
              [Media].[html],

              [User].[userName]

              ORDER BY [Pin].[utcStartDateTime];
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
