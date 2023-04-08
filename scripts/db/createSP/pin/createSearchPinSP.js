let cp;
let Request;
const StoredProcedureName = 'SearchPin';

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
          @searchTitle         NVARCHAR(64),
          @searchDescription   NVARCHAR(64),
          @top                 INT,
          @queryCount          INT OUTPUT
        AS
        BEGIN

        SET NOCOUNT ON;

        SELECT @searchTitle = RTRIM(@searchTitle) + '%';  
        SELECT @searchDescription = RTRIM(@searchDescription) + '%';  

        SELECT TOP (@top)
            [Pin].*

          FROM [dbo].[PinBaseView] AS [Pin]
            INNER JOIN [PinView]
              ON [Pin].[id] = [PinView].[id]

          WHERE [Pin].[utcDeletedDateTime] IS NULL 
            AND [PinView].[searchTitle] LIKE @searchTitle
            OR  [PinView].[searchDescription] LIKE @searchDescription

            ORDER BY [Pin].[utcStartDateTime];

            SET @queryCount = @@ROWCOUNT;
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
