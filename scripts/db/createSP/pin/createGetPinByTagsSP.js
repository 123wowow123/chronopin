let cp;
let Request;
const StoredProcedureName = 'GetPinByTags';

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
        DROP TYPE IF EXISTS tTags;
        DROP TYPE IF EXISTS tUTags;
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTVP() {
  let sql = `
        CREATE TYPE tTags AS Table (
          tag NVARCHAR(255)
        );
        CREATE TYPE tUTags AS Table (
          tag NVARCHAR(255)
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
           @TableTags         AS tTags READONLY,
           @TableUserTags     AS tUTags READONLY,
           @userId            INT,
           @followingOnly     BIT,
           @queryCount        INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        IF EXISTS (SELECT 1 FROM @TableTags) AND EXISTS (SELECT 1 FROM @TableUserTags)
        BEGIN

          SELECT
            [Pin].*,

            (CAST((SELECT COUNT(f.id)
              FROM [Favorite] AS f
              WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
            (CAST((SELECT COUNT(l.id)
              FROM [Like] AS l
              WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike]

          FROM [dbo].[PinBaseView] AS [Pin]
            JOIN @TableUserTags AS paramUserTable
              ON ([Pin].[User.userName] = paramUserTable.tag OR [Pin].[Mention.tag] = paramUserTable.tag)
            JOIN @TableTags AS paramTable
              ON ([Pin].[Mention.tag] = paramTable.tag)
            LEFT JOIN [dbo].[FollowUser] AS [FollowUser]
              ON [Pin].userId = [FollowUser].followingUserId

          WHERE [Pin].[utcDeletedDateTime] IS NULL
            AND (COALESCE(@followingOnly, 0) = 0 OR [FollowUser].userId = @userId)

          ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]

          SET @queryCount = @@ROWCOUNT;

        END

        ELSE IF EXISTS (SELECT 1 FROM @TableTags)
        BEGIN

          SELECT
            [Pin].*,

            (CAST((SELECT COUNT(f.id)
              FROM [Favorite] AS f
              WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
            (CAST((SELECT COUNT(l.id)
              FROM [Like] AS l
              WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike]

          FROM [dbo].[PinBaseView] AS [Pin]
            JOIN @TableTags AS paramTable
              ON ([Pin].[Mention.tag] = paramTable.tag)
            LEFT  JOIN [dbo].[FollowUser] AS [FollowUser]
              ON [Pin].userId = [FollowUser].followingUserId

          WHERE [Pin].[utcDeletedDateTime] IS NULL
            AND (COALESCE(@followingOnly, 0) = 0 OR [FollowUser].userId = @userId)

          ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]

          SET @queryCount = @@ROWCOUNT;

        END

        ELSE IF EXISTS (SELECT 1 FROM @TableUserTags)
        BEGIN

          SELECT
            [Pin].*,

            (CAST((SELECT COUNT(f.id)
              FROM [Favorite] AS f
              WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
            (CAST((SELECT COUNT(l.id)
              FROM [Like] AS l
              WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike]

          FROM [dbo].[PinBaseView] AS [Pin]
            JOIN @TableUserTags AS paramUserTable
              ON ([Pin].[User.userName] = paramUserTable.tag OR [Pin].[Mention.tag] = paramUserTable.tag)
            LEFT JOIN [dbo].[FollowUser] AS [FollowUser]
              ON [Pin].userId = [FollowUser].followingUserId

          WHERE [Pin].[utcDeletedDateTime] IS NULL
            AND (COALESCE(@followingOnly, 0) = 0 OR [FollowUser].userId = @userId)

          ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]

          SET @queryCount = @@ROWCOUNT;

        END

        ELSE 
        BEGIN
          -- Should not call this SP if both @TableTags & @TableUserTags are empty
          SET @queryCount = 0;
        END


        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}


// DECLARE @TableTags         AS tTags;
// DECLARE @TableUserTags     AS tUTags;
// DECLARE @userId            INT = 1;
// DECLARE @followingOnly     BIT =  CAST('false' as bit);
// DECLARE @queryCount        INT;

// INSERT INTO @TableUserTags VALUES ('@ThePinGang')

// SELECT
// [Pin].*,

// (CAST((SELECT COUNT(f.id)
//     FROM [Favorite] AS f
//     WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
// (CAST((SELECT COUNT(l.id)
//     FROM [Like] AS l
//     WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike]

// FROM [dbo].[PinBaseView] AS [Pin]
// JOIN @TableUserTags AS paramUserTable
//     ON ([Pin].[User.userName] = paramUserTable.tag OR [Pin].[Mention.tag] = paramUserTable.tag)
// JOIN [dbo].[FollowUser] AS [FollowUser]
//     ON [Pin].userId = [FollowUser].followingUserId

// WHERE [Pin].[utcDeletedDateTime] IS NULL
// AND (COALESCE(@followingOnly, 0) = 0 OR [FollowUser].userId = @userId)

// ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]