let cp;
let Request;
const StoredProcedureName = 'GetPinsWithFavoriteAndLikeArrayNext';

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
  @offset       INT,
  @pageSize     INT,
  @fromDateTime DATETIME2(7),
  @lastPinId    INT
AS
BEGIN

  SET NOCOUNT ON;

    SELECT
      [Pin].*

    FROM [dbo].[PinBaseView] AS [Pin]

    WHERE [Pin].[utcStartDateTime] > @fromDateTime
      OR ([Pin].[utcStartDateTime] = @fromDateTime
      AND [Pin].[id] > @lastPinId)
      AND [Pin].[utcDeletedDateTime] IS NULL

    ORDER BY [Pin].[utcStartDateTime], [Pin].[id]
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY

END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
