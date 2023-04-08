let cp;
let Request;
const StoredProcedureName = 'GetPinWithFavoriteAndLike';

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
           @pinId INT,
           @userId INT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT TOP 1
              [Pin].*,

              (CAST((SELECT COUNT(f.id) FROM [Favorite] AS f WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS bit)) AS [hasFavorite],
              (CAST((SELECT COUNT(l.id) FROM [Like] AS l WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS bit)) AS [hasLike]

            FROM [dbo].[PinBaseView] AS [Pin]

            WHERE [Pin].[id] = @pinId AND [Pin].[utcDeletedDateTime] IS NULL

            ORDER BY [Pin].[utcStartDateTime];
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
