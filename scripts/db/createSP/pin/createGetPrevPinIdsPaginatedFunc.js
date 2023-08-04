let cp;
let Request;
const NAME = 'GetPrevPinIdsPaginatedFunc';

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
  console.log(`Begin drop & create ${NAME}`);
  return Promise.resolve('begin query')
    .then(executeDropSP)
    .then(executeCreateSP)
    .then(res => {
      return `Create ${NAME} completed`;
    });
}

function executeDropSP() {
  let sql = `
        DROP FUNCTION IF EXISTS [dbo].[${NAME}];
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateSP() {
  let sql = `
        CREATE FUNCTION ${NAME} (
          @offset         INT,
          @pageSize       INT,
          @fromDateTime   DATETIME2(7),
          @lastPinId      INT,
          @userId         INT,
          @hasFavorite    BIT,
          @followingOnly  BIT
        )
        RETURNS TABLE AS
        RETURN 
        (
          SELECT
            [Pin].id

            FROM [dbo].[Pin] AS [Pin]
              LEFT JOIN [dbo].[FollowUser] AS [FollowUser]
                ON [Pin].userId = [FollowUser].followingUserId
              LEFT JOIN [dbo].[Favorite] AS [Favorites]
                ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL

            WHERE ([Pin].[utcStartDateTime] < @fromDateTime 
              OR ([Pin].[utcStartDateTime] = @fromDateTime AND [Pin].[id] < @lastPinId))
              AND [Pin].[utcDeletedDateTime] IS NULL
              AND (COALESCE(@hasFavorite, 0) = 0 OR [Favorites].userId = @userId)
              AND (COALESCE(@followingOnly, 0) = 0 OR [FollowUser].userId = @userId)

            ORDER BY [Pin].[utcStartDateTime] DESC, [Pin].[id] DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
          )
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
        
        
// SELECT
// [Pin].id

// FROM [dbo].[Pin] AS [Pin]
//     JOIN [dbo].[FollowUser] AS [FollowUser]
//     ON [Pin].userId = [FollowUser].followingUserId

// WHERE ([Pin].[utcStartDateTime] < @fromDateTime 
//     OR ([Pin].[utcStartDateTime] = @fromDateTime AND [Pin].[id] < @lastPinId))
//     AND [Pin].[utcDeletedDateTime] IS NULL
//     AND (COALESCE(@followingOnly, 0) = 0 OR [FollowUser].userId = @userId)

// ORDER BY [Pin].[utcStartDateTime] DESC, [Pin].[id] DESC
// OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY