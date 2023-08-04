let cp;
let Request;
const StoredProcedureName = 'GetPinsWithFavoriteAndLikePrevFilterByHasFavorite';

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
            @offset         INT,
            @pageSize       INT,
            @userId         INT,
            @fromDateTime   DATETIME2(7),
            @lastPinId      INT,
            @followingOnly  BIT,
            @queryCount     INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            DECLARE @tempPinsTbl TABLE(
              id                     INT       NOT NULL,
              parentId               INT,
              title                  NVARCHAR(1024),
              description            NVARCHAR(max),
              sourceUrl              NVARCHAR(4000),
              priceLowerBound        DECIMAL(18, 2),
              priceUpperBound        DECIMAL(18, 2),
              price                  DECIMAL(18, 2),
              tip                    NVARCHAR(4000),
              utcStartDateTime       DATETIME2,
              utcEndDateTime         DATETIME2,
              allDay                 BIT,
              userId                 INT,
              sentimentScore         DECIMAL(18, 17),
              utcCreatedDateTime     DATETIME2 NOT NULL,
              utcUpdatedDateTime     DATETIME2,
              favoriteCount          INT,
              likeCount              INT,
              rootThread             BIT,
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

              [User.userName]        NVARCHAR(255),

              [Merchant.id]         INT,
              [Merchant.label]      NVARCHAR(1000),
              [Merchant.url]        NVARCHAR(1000),
              [Merchant.price]      DECIMAL(18, 2),
              [Merchant.order]      INT,

              [Location.id]         INT,
              [Location.address]    NVARCHAR(2000),
              [Location.order]      INT
            );

            INSERT INTO @tempPinsTbl
              SELECT
                [Pin].[id],
                [Pin].[parentId],
                [Pin].[title],
                [Pin].[description],
                [Pin].[sourceUrl],
                [Pin].[priceLowerBound],
                [Pin].[priceUpperBound],
                [Pin].[price],
                [Pin].[tip],
                [Pin].[utcStartDateTime],
                [Pin].[utcEndDateTime],
                [Pin].[allDay],
                [Pin].[userId],
                [Pin].[sentimentScore],
                [Pin].[utcCreatedDateTime],
                [Pin].[utcUpdatedDateTime],

                [favoriteCount],
                [likeCount],
                [rootThread],

                (CAST((SELECT COUNT(f.id)
                       FROM [Favorite] AS f
                       WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
                (CAST((SELECT COUNT(l.id)
                       FROM [Like] AS l
                       WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike],

                [Media.id],
                [Media.thumbName],
                [Media.thumbWidth],
                [Media.thumbHeight],
                [Media.originalUrl],
                [Media.originalWidth],
                [Media.originalHeight],
                [Media.type],

                [Media.authorName],
                [Media.authorUrl],
                [Media.html],

                [User.userName],

                [Merchant.id],
                [Merchant.label],
                [Merchant.url],
                [Merchant.price],
                [Merchant.order],

                [Location.id],
                [Location.address],
                [Location.order]

              FROM [dbo].[PinBaseView] AS [Pin]
                JOIN GetPrevPinIdsPaginatedFunc(@offset, @pageSize, @fromDateTime, @lastPinId, @userId, CAST('true' as bit), @followingOnly) AS nextPin
                  ON nextPin.id = [Pin].id

              ORDER BY [Pin].[utcStartDateTime] DESC, [Pin].[id] DESC, [Merchant.order], [Location.order]

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


// DECLARE @userId INT = 1;
// DECLARE @offset INT = 0;
// DECLARE @pageSize INT = 10;
// DECLARE @lastPinId INT = 2147483647;
// DECLARE @fromDateTime DATETIME2(7) = GETDATE();
// DECLARE @followingOnly BIT =  CAST('false' as bit);  

// DECLARE @queryCountPrev INT;
// DECLARE @queryCountNext INT;

// EXEC [dbo].[GetPinsWithFavoriteAndLikePrevFilterByHasFavorite] 
// @offset, @pageSize, @userId, @fromDateTime, @lastPinId, @followingOnly, @queryCount = @queryCountPrev OUTPUT;



// EXEC [dbo].[GetPinsWithFavoriteAndLikeNextFilterByHasFavorite] 
// @offset, @pageSize, @userId, @fromDateTime, 0, @followingOnly, @queryCount = @queryCountNext OUTPUT;