let cp;
let Request;
const StoredProcedureName = 'SearchUserMention';

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
            @tag                NVARCHAR(1028)
        AS
          BEGIN

            SET NOCOUNT ON;

            SELECT @tag = RTRIM(@tag) + '%';

            SELECT TOP 10 t.userName 
            FROM (
              SELECT 
                userName,
                COUNT(FollowUser.followingUserId) AS FollowerCount
              FROM [dbo].[User] 
                JOIN [dbo].[FollowUser]
                  ON [FollowUser].followingUserId = [User].id
              WHERE userName LIKE @tag
              GROUP BY [User].userName
              ) t
              ORDER BY t.FollowerCount DESC, t.userName;

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
