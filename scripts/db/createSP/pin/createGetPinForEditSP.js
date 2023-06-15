let cp;
let Request;
const StoredProcedureName = 'GetPinForEdit';

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
           [Pin].*,
           [OriginalPin].[sourceDescription]

            FROM [dbo].[PinBaseView] AS [Pin]
             JOIN [dbo].[Pin] AS [OriginalPin]
              ON [Pin].id = [OriginalPin].id

            WHERE [Pin].[id] = @pinId AND [Pin].[utcDeletedDateTime] IS NULL

            ORDER BY [Pin].[utcStartDateTime], [Pin].[id], [Merchant.order], [Location.order]
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
