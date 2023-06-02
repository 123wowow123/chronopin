let cp;
let Request;
const StoredProcedureName = 'GetPinByIds';

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
        DROP TYPE IF EXISTS tIds;
        `;
  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}

function executeCreateTVP() {
  let sql = `
        CREATE TYPE tIds AS Table (
          tId INT
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
           @TableIds AS tIds READONLY,
           @userId       INT,
           @queryCount   INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT
              [Pin].*,

              (CAST((SELECT COUNT(f.id)
                FROM [Favorite] AS f
                WHERE f.userId = @userId AND f.PinId = [Pin].[id] AND f.utcDeletedDateTime IS NULL) AS BIT)) AS [hasFavorite],
              (CAST((SELECT COUNT(l.id)
                FROM [Like] AS l
                WHERE l.userId = @userId AND l.PinId = [Pin].[id] AND l.utcDeletedDateTime IS NULL) AS BIT)) AS [hasLike]

            FROM [dbo].[PinBaseView] AS [Pin]
              JOIN @TableIds AS paramTableIds
                ON [Pin].[id] = paramTableIds.tId

            WHERE [Pin].[utcDeletedDateTime] IS NULL

            ORDER BY [Pin].[utcStartDateTime];

            SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
