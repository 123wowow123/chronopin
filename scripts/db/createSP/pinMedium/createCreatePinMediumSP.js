let cp;
let Request;
const StoredProcedureName = 'CreatePinMedium';

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
            @pinId              INT,
            @mediumId           INT,
            @utcCreatedDateTime DATETIME2(7),
            @utcDeletedDateTime DATETIME2(7),
            @id                 INT OUTPUT
        AS
          BEGIN

            SET NOCOUNT ON;

            IF @utcCreatedDateTime IS NULL
            BEGIN
               SET @utcCreatedDateTime = sysutcdatetime();
            END

            INSERT INTO [dbo].[PinMedium] (
              pinId,
              mediumId,
              utcCreatedDateTime,
              utcDeletedDateTime
            )
            VALUES (
              @pinId,
              @mediumId,
              @utcCreatedDateTime,
              @utcDeletedDateTime
            )

            SET @id = SCOPE_IDENTITY();

          END;
        `;

  return cp.getConnection()
    .then(conn => {
      return new Request(conn).batch(sql);
    });
}
