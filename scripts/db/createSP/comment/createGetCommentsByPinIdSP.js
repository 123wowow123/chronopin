let cp;
let Request;
const StoredProcedureName = 'GetCommentsByPinId';

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
            @pinId INT
        AS
          BEGIN

            SET NOCOUNT ON;

            SELECT
            [Comment].id,
            [Comment].text,
            [Comment].userId,
            [Comment].pinId,
            [Comment].parentCommentId,
            [Comment].utcCreatedDateTime,
            [Comment].utcUpdatedDateTime,
            [User].userName AS [User.userName]
            FROM [dbo].[Comment] AS [Comment]
            LEFT JOIN [dbo].[User] AS [User]
              ON [Comment].userId = [User].id
            WHERE [Comment].pinId = @pinId AND [Comment].utcDeletedDateTime IS NULL
            ORDER BY [Comment].utcCreatedDateTime ASC;

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
