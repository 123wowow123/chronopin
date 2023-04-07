let cp;
let Request;
const StoredProcedureName = 'GetPinAuthorThread';

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
        
        WITH
            RECURSIVECTEPREVIOUS ([id], [parentId], [userId], reverseOrder)
            AS
            (
                    SELECT [id], [parentId], [userId], 0 as reverseOrder
                    FROM [dbo].[Pin] AS [Pin]
                    WHERE [Pin].[id] = @pinId
                        AND [Pin].[utcDeletedDateTime] IS NULL
        
                UNION ALL
                    SELECT [Pin].[id], [Pin].[parentId], [Pin].[userId], RECURSIVECTEPREVIOUS.reverseOrder + 1 as reverseOrder
                    FROM [dbo].[Pin] AS [Pin]
                        JOIN RECURSIVECTEPREVIOUS ON [Pin].[id] = RECURSIVECTEPREVIOUS.parentId
                    WHERE [Pin].[utcDeletedDateTime] IS NULL
                -- AND RECURSIVECTEPREVIOUS.userId = [Pin].[userId]
            ),
        
            RECURSIVECTENEXT ([id], [parentId], [userId], reverseOrder)
            AS
            (
                    SELECT [id], [parentId], [userId], 0 as reverseOrder
                    FROM [dbo].[Pin] AS [Pin]
                    WHERE [Pin].[id] = @pinId
                        AND [Pin].[utcDeletedDateTime] IS NULL
        
                UNION ALL
                    SELECT [Pin].[id], [Pin].[parentId], [Pin].[userId], RECURSIVECTENEXT.reverseOrder - 1 as reverseOrder
                    FROM [dbo].[Pin] AS [Pin]
                        JOIN RECURSIVECTENEXT ON [Pin].[parentId] = RECURSIVECTENEXT.id
                    WHERE [Pin].[utcDeletedDateTime] IS NULL
                        AND RECURSIVECTENEXT.userId = [Pin].[userId]
            )
        
        SELECT *
            FROM RECURSIVECTEPREVIOUS
        UNION
        SELECT *
            FROM RECURSIVECTENEXT
        END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
