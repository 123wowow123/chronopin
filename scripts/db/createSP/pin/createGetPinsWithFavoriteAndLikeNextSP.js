let cp;
let Request;
const StoredProcedureName = 'GetPinsWithFavoriteAndLikeNext';

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
            @offset       INT,
            @pageSize     INT,
            @userId       INT,
            @fromDateTime DATETIME2(7),
            @lastPinId    INT,
            @queryCount   INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            DECLARE @tempPinsTbl TABLE(
              id                    INT       NOT NULL,
              title                  NVARCHAR(1024),
              description            NVARCHAR(4000),
              sourceUrl              NVARCHAR(4000),
              address                NVARCHAR(4000),
              priceLowerBound        DECIMAL(18, 2),
              priceUpperBound        DECIMAL(18, 2),
              price                  DECIMAL(18, 2),
              tip                    NVARCHAR(4000),
              utcStartDateTime       DATETIME2,
              utcEndDateTime         DATETIME2,
              allDay                 BIT,
              userId                 INT,
              utcCreatedDateTime     DATETIME2 NOT NULL,
              utcUpdatedDateTime     DATETIME2,
              favoriteCount          INT,
              likeCount              INT,
              hasFavorite            BIT,
              hasLike                BIT,
              [Media.id]             INT,
              [Media.thumbName]      NVARCHAR(4000),
              [Media.thumbWidth]     INT,
              [Media.thumbHeight]    INT,
              [Media.originalUrl]    NVARCHAR(4000),
              [Media.originalWidth]  INT,
              [Media.originalHeight] INT,
              [Media.type]           INT,

              [Media.authorName]     NVARCHAR(1028),
              [Media.authorUrl]      NVARCHAR(4000),
              [Media.html]           NVARCHAR(4000),

              [User.userName]      NVARCHAR(255)
            );

            INSERT INTO @tempPinsTbl
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

                COUNT([Favorites].[id])                                                    AS [favoriteCount],
                COUNT([Likes].[id])                                                        AS [likeCount],

                (CAST((SELECT COUNT(f.id)
                       FROM [Favorite] AS f
                       WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
                (CAST((SELECT COUNT(l.id)
                       FROM [Like] AS l
                       WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike],

                [Media].[id]                                                                AS [Media.id],
                [Media].[thumbName]                                                         AS [Media.thumbName],
                [Media].[thumbWidth]                                                        AS [Media.thumbWidth],
                [Media].[thumbHeight]                                                       AS [Media.thumbHeight],
                [Media].[originalUrl]                                                       AS [Media.originalUrl],
                [Media].[originalWidth]                                                     AS [Media.originalWidth],
                [Media].[originalHeight]                                                    AS [Media.originalHeight],
                [Media].[type]                                                              AS [Media.type],

                [Media].[authorName]                                                        AS [Media.authorName],
                [Media].[authorUrl]                                                         AS [Media.authorUrl],
                [Media].[html]                                                              AS [Media.html],

                [User].[userName]                                                           AS [User.userName]

              FROM [dbo].[Pin]
                LEFT JOIN [dbo].[PinMedium] AS [Media.PinMedium]
                  ON [Pin].[id] = [Media.PinMedium].[PinId]
                LEFT JOIN [dbo].[Medium] AS [Media]
                  ON [Media].[id] = [Media.PinMedium].[MediumId] AND [Media.PinMedium].[utcDeletedDateTime] IS NULL
                LEFT JOIN [dbo].[Favorite] AS [Favorites]
                  ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
                LEFT JOIN [dbo].[Like] AS [Likes] ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL
                LEFT JOIN [dbo].[User] AS [User]
                  ON [Pin].[userId] = [User].[id]

              WHERE [Pin].[utcStartDateTime] > @fromDateTime OR ([Pin].[utcStartDateTime] = @fromDateTime AND [Pin].[id] > @lastPinId) AND [Pin].[utcDeletedDateTime] IS NULL

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
                [Media].[html],

                [User].[userName]

              ORDER BY [Pin].[utcStartDateTime], [Pin].[id]
              OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY

            SELECT *
            FROM @tempPinsTbl;

            SET @queryCount = (SELECT COUNT(id)
                               FROM @tempPinsTbl);

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
