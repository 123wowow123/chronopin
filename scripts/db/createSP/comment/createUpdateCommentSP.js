let cp;
let Request;
const StoredProcedureName = 'UpdateComment';
const EditWindowMinutes = 5;

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
            @id                 INT,
            @userId             INT,
            @text               NVARCHAR(4000),
            @utcUpdatedDateTime DATETIME2(7) OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            SET @utcUpdatedDateTime = sysutcdatetime();

            UPDATE [dbo].[Comment]
            SET
              text = @text,
              utcUpdatedDateTime = @utcUpdatedDateTime
            WHERE id = @id
              AND userId = @userId
              AND utcDeletedDateTime IS NULL
              AND utcCreatedDateTime >= DATEADD(MINUTE, -${EditWindowMinutes}, @utcUpdatedDateTime);

            IF @@ROWCOUNT = 0
            BEGIN
              SET @utcUpdatedDateTime = NULL;
            END

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
