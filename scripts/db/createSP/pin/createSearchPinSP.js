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
          @userId              INT,
          @followingOnly       BIT,
          @top                 INT,
          @queryCount          INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT @searchTitle = RTRIM(@searchTitle) + '%';  
        SELECT @searchDescription = RTRIM(@searchDescription) + '%';

        SELECT TOP (@top)
            [Pin].*

          FROM [dbo].[PinBaseView] AS [Pin]
            JOIN [PinView]
              ON [Pin].[id] = [PinView].[id]
            LEFT JOIN [dbo].[FollowUser] AS [FollowUser]
              ON [PinView].userId = [FollowUser].followingUserId

          WHERE [Pin].[utcDeletedDateTime] IS NULL 
            AND ([PinView].[searchTitle] LIKE @searchTitle
            OR  [PinView].[searchDescription] LIKE @searchDescription)
            AND (COALESCE(@followingOnly, 0) = 0 OR [FollowUser].userId = @userId)

            ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]

            SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}


// DECLARE @test INT;
// DECLARE @userId INT = 1;
// DECLARE @offset INT = 0;
// DECLARE @pageSize INT = 10;
// DECLARE @lastPinId INT = 2147483647;
// DECLARE @fromDateTime DATETIME2(7) = GETDATE();
// DECLARE @followingOnly BIT =  CAST('false' as bit);
        
        
// Select *
// From [dbo].[GetPrevPinIdsPaginatedFunc] (
// @offset, @pageSize, @fromDateTime, @lastPinId, @userId, @followingOnly)