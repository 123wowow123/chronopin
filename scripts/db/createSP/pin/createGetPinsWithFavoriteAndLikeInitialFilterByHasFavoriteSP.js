let cp;
let Request;
const StoredProcedureName = 'GetPinsWithFavoriteAndLikeInitialFilterByHasFavorite';

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
            @pageSizePrev INT,
            @pageSizeNext INT,
            @userId       INT,
            @fromDateTime DATETIME2(7),
            @queryCount   INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            DECLARE @queryCountPrev INT;
            DECLARE @queryCountNext INT;

            DECLARE @tempPinsTbl TABLE(
              id                     INT       NOT NULL,
              parentId               INT,
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
            EXEC [dbo].[GetPinsWithFavoriteAndLikePrevFilterByHasFavorite] 0, @pageSizePrev, @userId, @fromDateTime, 0, @queryCount = @queryCountPrev OUTPUT;

            INSERT INTO @tempPinsTbl
            EXEC [dbo].[GetPinsWithFavoriteAndLikeNextFilterByHasFavorite] 0, @pageSizeNext, @userId, @fromDateTime, 0, @queryCount = @queryCountNext OUTPUT;

            SELECT *
            FROM @tempPinsTbl
            ORDER BY [utcStartDateTime], [id];

            SET @queryCount = @queryCountPrev + @queryCountNext;

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}


// DECLARE @test INT;
// DECLARE @date DATETIME2(7) = GETDATE();
//
// EXEC GetPinsWithFavoriteAndLikeInitial
//      @userId = -1
//     , @fromDateTime = @date
//     , @pageSizePrev = 10
//     , @pageSizeNext = 20
//     , @queryCount = @test OUTPUT;
//
// PRINT 'test var: ' + CONVERT(VARCHAR, @test)
