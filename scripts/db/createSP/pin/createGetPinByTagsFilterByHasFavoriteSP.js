let cp;
let Request;
const StoredProcedureName = 'GetPinByTagsFilterByHasFavorite';

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
        DROP TYPE IF EXISTS tTags2;
        DROP TYPE IF EXISTS tUTags2;
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTVP() {
  let sql = `
        CREATE TYPE tTags2 AS Table (
          tag NVARCHAR(255)
        );
        CREATE TYPE tUTags2 AS Table (
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
           @TableTags AS tTags2 READONLY,
           @TableUserTags AS tUTags2 READONLY,
           @userId       INT,
           @queryCount   INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        IF EXISTS (SELECT 1 FROM @TableTags) AND EXISTS (SELECT 1 FROM @TableUserTags)
        BEGIN

          SELECT
                [Pin].*

              FROM [dbo].[PinBaseView] AS [Pin]
                JOIN @TableUserTags AS paramUserTable
                  ON ([Pin].[User.userName] = paramUserTable.tag OR [Pin].[Mention.tag] = paramUserTable.tag)
                JOIN @TableTags AS paramTable
                  ON ([Pin].[Mention.tag] = paramTable.tag)
                LEFT JOIN [dbo].[Favorite] AS [Favorites]
                  ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL

                WHERE [Pin].[utcDeletedDateTime] IS NULL
                  AND [Favorites].[userId] = @userId

                ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]

                SET @queryCount = @@ROWCOUNT;

              END

              ELSE IF EXISTS (SELECT 1 FROM @TableTags)
              BEGIN
        
                SELECT
                [Pin].*

                FROM [dbo].[PinBaseView] AS [Pin]
                  JOIN @TableTags AS paramTable
                    ON ([Pin].[Mention.tag] = paramTable.tag)
                  LEFT JOIN [dbo].[Favorite] AS [Favorites]
                    ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL

                  WHERE [Pin].[utcDeletedDateTime] IS NULL
                    AND [Favorites].[userId] = @userId

                  ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]

                  SET @queryCount = @@ROWCOUNT;
        
              END

              ELSE IF EXISTS (SELECT 1 FROM @TableUserTags)
              BEGIN

                SELECT
                [Pin].*

                FROM [dbo].[PinBaseView] AS [Pin]
                  JOIN @TableUserTags AS paramUserTable
                    ON ([Pin].[User.userName] = paramUserTable.tag OR [Pin].[Mention.tag] = paramUserTable.tag)
                  LEFT JOIN [dbo].[Favorite] AS [Favorites]
                    ON [Pin].[id] = [Favorites].[PinId] AND [Favorites].[utcDeletedDateTime] IS NULL

                  WHERE [Pin].[utcDeletedDateTime] IS NULL
                    AND [Favorites].[userId] = @userId

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
