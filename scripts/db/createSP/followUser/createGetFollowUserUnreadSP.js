let cp;
let Request;
const StoredProcedureName = 'GetFollowUserUnread';

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
    @currentUserId INT
  AS
    BEGIN

      SET NOCOUNT ON;

      SELECT
        Pin.*,
        
        (CAST((SELECT COUNT(f.id)
          FROM [Favorite] AS f
            WHERE f.userId = @currentUserId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
        (CAST((SELECT COUNT(l.id)
          FROM [Like] AS l
            WHERE l.userId = @currentUserId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike]
  
      FROM [dbo].[FollowUser]
        JOIN [dbo].[PinBaseView] AS [Pin]
          ON [Pin].userId = [FollowUser].followingUserId
      
      WHERE [FollowUser].userId = @currentUserId AND [FollowUser].utcCheckedDateTime < [Pin].utcCreatedDateTime;

    END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
