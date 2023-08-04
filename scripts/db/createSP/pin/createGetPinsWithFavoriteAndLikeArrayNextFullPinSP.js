let cp;
let Request;
const StoredProcedureName = 'GetPinsWithFavoriteAndLikeArrayNextFullPin';

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
  @fromDateTime   DATETIME2(7),
  @lastPinId      INT,
  @userId         INT,
  @followingOnly  BIT
AS
BEGIN

  SET NOCOUNT ON;

    SELECT
      [Pin].*,

      [Likes].[id]                               AS [Likes.id],
      [Likes].[like]                             AS [Likes.like],
      [Likes].[userId]                           AS [Likes.userId],
      [Likes].[pinId]                            AS [Likes.pinId],
      [Likes].[utcCreatedDateTime]               AS [Likes.utcCreatedDateTime],
      [Likes].[utcUpdatedDateTime]               AS [Likes.utcUpdatedDateTime],

      [Favorites].[id]                           AS [Favorites.id],
      [Favorites].[userId]                       AS [Favorites.userId],
      [Favorites].[pinId]                        AS [Favorites.pinId],
      [Favorites].[utcCreatedDateTime]           AS [Favorites.utcCreatedDateTime],
      [Favorites].[utcUpdatedDateTime]           AS [Favorites.utcUpdatedDateTime],

      [OriginalPin].[sourceDescription]

    FROM [dbo].[PinBaseView] AS [Pin]
      JOIN GetNextPinIdsPaginatedFunc(@offset, @pageSize, @fromDateTime, @lastPinId, @userId, CAST('false' as bit), @followingOnly) AS nextPin
        ON nextPin.id = [Pin].id
      LEFT JOIN [dbo].[Favorite] AS [Favorites]
        ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
      LEFT JOIN [dbo].[Like] AS [Likes] 
        ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL
      JOIN [dbo].[Pin] AS [OriginalPin]
        ON [Pin].id = [OriginalPin].id

    ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]

END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}


// DECLARE @userId INT = 0;
// DECLARE @offset INT = 0;
// DECLARE @pageSize INT = 2147483647;
// DECLARE @lastPinId INT = 0;
// DECLARE @fromDateTime DATETIME2(7) = CAST('1753-1-1' as DATETIME2(7));
// DECLARE @followingOnly BIT =  CAST('false' as bit); 
    
// SELECT
//     [Pin].*,

//     [Likes].[id]                               AS [Likes.id],
//     [Likes].[like]                             AS [Likes.like],
//     [Likes].[userId]                           AS [Likes.userId],
//     [Likes].[pinId]                            AS [Likes.pinId],
//     [Likes].[utcCreatedDateTime]               AS [Likes.utcCreatedDateTime],
//     [Likes].[utcUpdatedDateTime]               AS [Likes.utcUpdatedDateTime],

//     [Favorites].[id]                           AS [Favorites.id],
//     [Favorites].[userId]                       AS [Favorites.userId],
//     [Favorites].[pinId]                        AS [Favorites.pinId],
//     [Favorites].[utcCreatedDateTime]           AS [Favorites.utcCreatedDateTime],
//     [Favorites].[utcUpdatedDateTime]           AS [Favorites.utcUpdatedDateTime],

//     [OriginalPin].[sourceDescription]

// FROM [dbo].[PinBaseView] AS [Pin]
//     JOIN GetNextPinIdsPaginatedFunc(@offset, @pageSize, @fromDateTime, @lastPinId, @userId, CAST('false' as bit), @followingOnly) AS nextPin
//     ON nextPin.id = [Pin].id
//     LEFT JOIN [dbo].[Favorite] AS [Favorites]
//     ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL
//     LEFT JOIN [dbo].[Like] AS [Likes] 
//     ON [Pin].[id] = [Likes].[PinId] AND [Likes].[utcDeletedDateTime] IS NULL
//     JOIN [dbo].[Pin] AS [OriginalPin]
//     ON [Pin].id = [OriginalPin].id

// ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]