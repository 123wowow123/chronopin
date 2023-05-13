let cp;
let Request;
const StoredProcedureName = 'GetPinByIdsAndOrderedByThread';

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

        DECLARE @tIdsOrderedTbl TABLE(
          id                     INT       NOT NULL,
          parentId               INT,
          userId                 INT       NOT NULL,
          reverseOrder           INT       NOT NULL
        );

        INSERT INTO @tIdsOrderedTbl
        EXEC [dbo].[GetPinAuthorThread] @pinId;

        SELECT
              [Pin].*,

              paramTableIds.reverseOrder                 AS reverseOrder

            FROM [dbo].[PinBaseView] AS [Pin]
              JOIN @tIdsOrderedTbl AS paramTableIds
                ON [Pin].[id] = paramTableIds.id

            WHERE [Pin].[utcDeletedDateTime] IS NULL
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
