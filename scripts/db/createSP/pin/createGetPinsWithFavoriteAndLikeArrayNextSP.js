let cp;
let Request;
const StoredProcedureName = 'GetPinsWithFavoriteAndLikeArrayNext';

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
CREATE PROCEDURE [dbo].[${GetPinsWithFavoriteAndLikeArrayNext}]
  @offset       INT,
  @pageSize     INT,
  @fromDateTime DATETIME2(7),
  @lastPinId    INT
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

      [Media].[id]                                                                AS [Media.id],
      [Media].[thumbName]                                                         AS [Media.thumbName],
      [Media].[thumbWidth]                                                        AS [Media.thumbWidth],
      [Media].[thumbHeight]                                                       AS [Media.thumbHeight],
      [Media].[originalUrl]                                                       AS [Media.originalUrl],
      [Media].[originalWidth]                                                     AS [Media.originalWidth],
      [Media].[originalHeight]                                                    AS [Media.originalHeight],
      [Media].[type]                                                              AS [Media.type],

      [Favorites].[userId]                                                        AS [Favorites.userId],
      [Favorites].[utcCreatedDateTime]                                                        AS [Favorites.userId],

      [Likes].[userId]                                                            AS [Likes.userId],
      [Likes].[utcCreatedDateTime]                                                            AS [Likes.userId],
      [Likes].[like]                                                            AS [Likes.userId]

    FROM [dbo].[Pin]
      LEFT JOIN [dbo].[PinMedium] AS [Media.PinMedium]
        ON [Pin].[id] = [Media.PinMedium].[PinId]
      LEFT JOIN [dbo].[Medium] AS [Media]
        ON [Media].[id] = [Media.PinMedium].[MediumId] AND [Media.PinMedium].[utcDeletedDateTime] IS NULL
      LEFT JOIN [dbo].[Favorite] AS [Favorites]
        ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
      LEFT JOIN [dbo].[Like] AS [Likes] ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL

    WHERE [Pin].[utcStartDateTime] > @fromDateTime
      OR ([Pin].[utcStartDateTime] = @fromDateTime
      AND [Pin].[id] > @lastPinId)
      AND [Pin].[utcDeletedDateTime] IS NULL

    ORDER BY [Pin].[utcStartDateTime], [Pin].[id]
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY

END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
